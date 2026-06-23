import fs from "node:fs/promises";
import path from "node:path";
import { CommandLogger, defaultCommandExecutor, runDetachedCommand } from "./command.js";
import { loadMatrixConfig } from "./config.js";
import {
  buildStartEmulatorCommand,
  buildStopEmulatorCommand,
  installHaps,
  prepareDevice,
  verifyFileExists,
  waitForTargetDisconnected,
  writeDeviceLog,
} from "./device.js";
import { buildAaTestCommand, parseAaTestOutput, shellQuote } from "./ohostest.js";
import { deriveMatrixStatus, renderSummaryMarkdown } from "./result.js";
import type {
  BuildResult,
  CommandResult,
  DeviceRunResult,
  MatrixConfig,
  MatrixResult,
  RunMatrixInput,
} from "./types.js";

export async function runOhosTestMatrix(input: RunMatrixInput): Promise<MatrixResult> {
  const startedTime = Date.now();
  const startedAt = new Date(startedTime).toISOString();
  const config = await loadMatrixConfig({
    project: input.project,
    machineConfigPath: input.machineConfigPath,
    testClass: input.testClass,
  });
  const selectedDevices =
    input.devices && input.devices.length > 0
      ? config.devices.filter((device) => input.devices?.includes(device.id))
      : config.devices;
  const out = path.resolve(
    input.out ??
      path.join(config.project, ".ohostest-runs", timestampForPath(new Date(startedTime)), "result.json"),
  );
  const outDir = path.dirname(out);
  await fs.mkdir(outDir, { recursive: true });
  const logger = new CommandLogger(path.join(outDir, "commands.log"));
  const executor = input.commandExecutor ?? defaultCommandExecutor;
  const diagnostics: string[] = [];

  async function runCommand(command: string): Promise<CommandResult> {
    const result = await executor(command, config.project);
    await logger.record(command, result);
    return result;
  }

  async function runDetached(command: string): Promise<CommandResult> {
    const result = await runDetachedCommand(command, config.project);
    await logger.record(command, result);
    return result;
  }

  const build = await runBuild({
    config,
    skipBuild: input.skipBuild ?? false,
    runCommand,
    diagnostics,
  });

  const devices: DeviceRunResult[] = [];
  if (build.status === "passed") {
    for (const device of selectedDevices) {
      devices.push(
        await runDevice({
          config,
          device,
          outDir,
          keepEmulators: input.keepEmulators ?? false,
          runCommand,
          runDetached,
        }),
      );
    }
  }

  const status = deriveMatrixStatus(devices);
  const finishedTime = Date.now();
  const summary = renderSummaryMarkdown(status, devices);
  await fs.writeFile(path.join(outDir, "summary.md"), summary, "utf-8");

  const result: MatrixResult = {
    schemaVersion: "ohostest-matrix-v1",
    project: config.project,
    status,
    startedAt,
    finishedAt: new Date(finishedTime).toISOString(),
    durationMs: finishedTime - startedTime,
    build,
    devices,
    artifacts: {
      commandLog: "commands.log",
      summary: "summary.md",
    },
    diagnostics,
  };
  await fs.writeFile(out, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  return result;
}

async function runBuild(input: {
  config: MatrixConfig;
  skipBuild: boolean;
  runCommand: (command: string) => Promise<CommandResult>;
  diagnostics: string[];
}): Promise<BuildResult> {
  const started = Date.now();
  if (!input.skipBuild) {
    for (const command of buildCommands(input.config)) {
      const result = await input.runCommand(command);
      if (result.exitCode !== 0) {
        input.diagnostics.push(`构建命令失败：${command}`);
        return {
          status: "blocked",
          appHap: input.config.artifacts.appHap,
          testHap: input.config.artifacts.testHap,
          durationMs: Date.now() - started,
          blockedReason: "build_failed",
        };
      }
    }
  }

  try {
    await verifyFileExists(input.config.artifacts.appHap);
    await verifyFileExists(input.config.artifacts.testHap);
  } catch (error) {
    input.diagnostics.push(`HAP 文件不存在：${error instanceof Error ? error.message : String(error)}`);
    return {
      status: "blocked",
      appHap: input.config.artifacts.appHap,
      testHap: input.config.artifacts.testHap,
      durationMs: Date.now() - started,
      blockedReason: "hap_missing",
    };
  }

  return {
    status: "passed",
    appHap: input.config.artifacts.appHap,
    testHap: input.config.artifacts.testHap,
    durationMs: Date.now() - started,
  };
}

async function runDevice(input: {
  config: MatrixConfig;
  device: MatrixConfig["devices"][number];
  outDir: string;
  keepEmulators: boolean;
  runCommand: (command: string) => Promise<CommandResult>;
  runDetached: (command: string) => Promise<CommandResult>;
}): Promise<DeviceRunResult> {
  const started = Date.now();
  const logLines: string[] = [`device: ${input.device.id}`, `target: ${input.device.target}`];

  try {
    if (input.device.startEmulator) {
      const start = await input.runDetached(buildStartEmulatorCommand(input.config, input.device));
      logLines.push(`emulatorStartExitCode: ${start.exitCode}`);
      if (start.exitCode !== 0) {
        return blockedDevice(input, started, logLines, "emulator_start_failed");
      }
    }

    await prepareDevice({
      config: input.config,
      device: input.device,
      cwd: input.config.project,
      outDir: input.outDir,
      runCommand: input.runCommand,
    });
    await installHaps({
      config: input.config,
      device: input.device,
      cwd: input.config.project,
      outDir: input.outDir,
      runCommand: input.runCommand,
    });

    const testCommand = buildAaTestCommand({
      hdc: input.config.paths.hdc,
      target: input.device.target,
      bundleName: input.config.bundleName,
      testModule: input.config.testModule,
      testRunner: input.config.testRunner,
      timeoutMs: input.config.timeoutMs,
      ...(input.config.testClass ? { testClass: input.config.testClass } : {}),
    });
    const testResult = await input.runCommand(testCommand);
    logLines.push("aaTestStdout:", testResult.stdout.trimEnd(), "aaTestStderr:", testResult.stderr.trimEnd());
    if (testResult.exitCode !== 0) {
      return blockedDevice(input, started, logLines, "test_command_failed");
    }
    const parsed = parseAaTestOutput(`${testResult.stdout}\n${testResult.stderr}`);
    if (!parsed.ok && parsed.blockedReason) {
      return blockedDevice(input, started, logLines, parsed.blockedReason);
    }
    const status = parsed.ok ? "passed" : "failed";
    const log = await writeDeviceLog({
      outDir: input.outDir,
      deviceId: input.device.id,
      lines: logLines,
    });
    return {
      id: input.device.id,
      ...(input.device.profile ? { profile: input.device.profile } : {}),
      target: input.device.target,
      status,
      testsRun: parsed.testsRun ?? 0,
      failures: parsed.failures ?? 0,
      errors: parsed.errors ?? 0,
      passes: parsed.passes ?? 0,
      ignored: parsed.ignored ?? 0,
      ...(parsed.reportCode !== undefined ? { reportCode: parsed.reportCode } : {}),
      durationMs: Date.now() - started,
      log,
    };
  } catch (error) {
    const reason = reasonFromError(error);
    return blockedDevice(input, started, [...logLines, String(error)], reason);
  } finally {
    if (input.device.startEmulator && !input.keepEmulators) {
      await input.runDetached(buildStopEmulatorCommand(input.config, input.device));
      await waitForTargetDisconnected({
        config: input.config,
        device: input.device,
        cwd: input.config.project,
        outDir: input.outDir,
        runCommand: input.runCommand,
      });
    }
  }
}

async function blockedDevice(
  input: {
    device: MatrixConfig["devices"][number];
    outDir: string;
  },
  started: number,
  logLines: string[],
  blockedReason: DeviceRunResult["blockedReason"],
): Promise<DeviceRunResult> {
  const log = await writeDeviceLog({
    outDir: input.outDir,
    deviceId: input.device.id,
    lines: [...logLines, `blockedReason: ${blockedReason}`],
  });
  return {
    id: input.device.id,
    ...(input.device.profile ? { profile: input.device.profile } : {}),
    target: input.device.target,
    status: "blocked",
    testsRun: 0,
    failures: 0,
    errors: 0,
    passes: 0,
    ignored: 0,
    durationMs: Date.now() - started,
    log,
    blockedReason,
  };
}

function buildCommands(config: MatrixConfig): string[] {
  const buildExecutable = shellQuote(config.paths.hvigorw);
  const appBase = `${buildExecutable} --mode ${config.build.mode} -p product=${config.product}`;
  const appSuffix = "--analyze=normal --parallel --incremental --no-daemon";
  const testBase = `${buildExecutable} --mode module -p module=${config.module}@ohosTest`;
  return [
    `${appBase} ${config.build.appTask} ${appSuffix}`,
    `${testBase} ${config.build.testTask} --no-daemon --stacktrace`,
  ];
}

function reasonFromError(error: unknown): DeviceRunResult["blockedReason"] {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("install_failed")) {
    return "install_failed";
  }
  if (message.includes("hdc_not_connected")) {
    return "hdc_not_connected";
  }
  if (message.includes("test_output_unparseable")) {
    return "test_output_unparseable";
  }
  return "test_command_failed";
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

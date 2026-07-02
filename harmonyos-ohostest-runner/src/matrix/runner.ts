import fs from "node:fs/promises";
import path from "node:path";
import { CommandLogger, defaultCommandExecutor, runDetachedCommand } from "../shared/command.js";
import { sleep } from "../shared/utils/sleep.js";
import { buildTestHapCommand, runBuild } from "./build.js";
import { loadMatrixConfig } from "./config.js";
import {
  buildStartEmulatorCommand,
  buildStopEmulatorCommand,
  installHaps,
  prepareDevice,
  waitForTargetDisconnected,
  writeDeviceLog,
} from "./device.js";
import { buildAaTestCommand, parseAaTestOutput } from "./ohostest.js";
import { deriveMatrixStatus, renderSummaryMarkdown } from "./result.js";
import { deployFoldTrigger, killFoldServer, startFoldServer } from "../fold/server.js";
import type { FoldServerInstance } from "../fold/server.js";
import type {
  CommandResult,
  DeviceRunResult,
  MatrixConfig,
  MatrixResult,
  RunMatrixInput,
  SuiteRunResult,
} from "./types/index.js";

const emulatorRestartCooldownMs = 5000;

export async function runOhosTestMatrix(input: RunMatrixInput): Promise<MatrixResult> {
  const startedTime = Date.now();
  const startedAt = new Date(startedTime).toISOString();
  const config = await loadMatrixConfig({
    project: input.project,
    machineConfigPath: input.machineConfigPath,
    testClass: input.testClass,
    deviceSuiteOverrides: input.deviceSuiteOverrides,
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

  // Pre-deploy default FoldTrigger.ets so the global build succeeds
  if (selectedDevices.some((d) => d.foldControl)) {
    await deployFoldTrigger(config.project, 8765, config.moduleSrcPath);
  }

  const build = await runBuild({
    config,
    skipBuild: input.skipBuild ?? false,
    runCommand,
    diagnostics,
  });

  const devices: DeviceRunResult[] = [];
  if (build.status === "passed") {
    for (let index = 0; index < selectedDevices.length; index += 1) {
      const device = selectedDevices[index];
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
      if (shouldWaitBeforeNextEmulatorStart(selectedDevices, index, input.keepEmulators ?? false)) {
        await sleep(emulatorRestartCooldownMs);
      }
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

function shouldWaitBeforeNextEmulatorStart(
  devices: MatrixConfig["devices"],
  currentIndex: number,
  keepEmulators: boolean,
): boolean {
  return (
    !keepEmulators &&
    devices[currentIndex]?.startEmulator === true &&
    devices.slice(currentIndex + 1).some((device) => device.startEmulator)
  );
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
  let foldServer: FoldServerInstance | undefined;

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

    // Start fold server if device needs fold control
    if (input.device.foldControl && input.config.paths.foldServerScript) {
      try {
        foldServer = await startFoldServer(input.device, input.config.paths.foldServerScript);
        logLines.push(`foldServerPort: ${foldServer.port}`);
        const triggerPath = await deployFoldTrigger(
          input.config.project,
          foldServer.devicePort,
          input.config.moduleSrcPath,
        );
        logLines.push(`deployedFoldTrigger: ${triggerPath}`);

        // Rebuild test HAP with the new FoldTrigger.ets port
        const testBuildCmd = buildTestHapCommand(input.config);
        const buildResult = await input.runCommand(testBuildCmd);
        logLines.push(`foldTestBuildExitCode: ${buildResult.exitCode}`);
        if (buildResult.exitCode !== 0) {
          logLines.push(`foldTestBuildStderr: ${buildResult.stderr.trimEnd()}`);
        }
      } catch (error) {
        logLines.push(`foldServerError: ${error instanceof Error ? error.message : String(error)}`);
        return blockedDevice(input, started, logLines, "fold_server_start_failed");
      }
    }

    await installHaps({
      config: input.config,
      device: input.device,
      cwd: input.config.project,
      outDir: input.outDir,
      runCommand: input.runCommand,
    });

    const suiteClasses = input.config.testClass
      ? [input.config.testClass]
      : input.device.testClasses && input.device.testClasses.length > 0
        ? input.device.testClasses
        : [];
    const suiteResults: SuiteRunResult[] = [];

    if (suiteClasses.length > 0) {
      for (const suiteClass of suiteClasses) {
        suiteResults.push(await runSuite({ ...input, suiteClass, logLines }));
      }
    } else {
      const testResult = await input.runCommand(buildTestCommand(input.config, input.device));
      logLines.push("aaTestStdout:", testResult.stdout.trimEnd(), "aaTestStderr:", testResult.stderr.trimEnd());
      if (testResult.exitCode !== 0) {
        return blockedDevice(input, started, logLines, "test_command_failed");
      }
      const parsed = parseAaTestOutput(`${testResult.stdout}\n${testResult.stderr}`);
      if (!parsed.ok && parsed.blockedReason) {
        return blockedDevice(input, started, logLines, parsed.blockedReason);
      }
      suiteResults.push({
        suiteClass: "ALL",
        status: parsed.ok ? "passed" : "failed",
        testsRun: parsed.testsRun ?? 0,
        failures: parsed.failures ?? 0,
        errors: parsed.errors ?? 0,
        passes: parsed.passes ?? 0,
        ignored: parsed.ignored ?? 0,
        reportCode: parsed.reportCode ?? null,
        ok: parsed.ok,
        testCases: parsed.testCases ?? [],
      });
    }

    const status = suiteResults.some((suite) => suite.status !== "passed") ? "failed" : "passed";
    const aggregate = aggregateSuites(suiteResults);
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
      testsRun: aggregate.testsRun,
      failures: aggregate.failures,
      errors: aggregate.errors,
      passes: aggregate.passes,
      ignored: aggregate.ignored,
      suiteResults,
      durationMs: Date.now() - started,
      log,
      ...(foldServer ? { foldServerPort: foldServer.port } : {}),
    };
  } catch (error) {
    const reason = reasonFromError(error);
    return blockedDevice(input, started, [...logLines, String(error)], reason);
  } finally {
    // Stop fold server if started
    if (foldServer) {
      killFoldServer(foldServer);
    }
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
    suiteResults: [],
    durationMs: Date.now() - started,
    log,
    blockedReason,
  };
}

async function runSuite(input: {
  config: MatrixConfig;
  device: MatrixConfig["devices"][number];
  suiteClass: string;
  logLines: string[];
  runCommand: (command: string) => Promise<CommandResult>;
}): Promise<SuiteRunResult> {
  input.logLines.push(`suiteClass: ${input.suiteClass}`);
  const testResult = await input.runCommand(buildTestCommand(input.config, input.device, input.suiteClass));
  input.logLines.push(
    `aaTestClass: ${input.suiteClass}`,
    "aaTestStdout:",
    testResult.stdout.trimEnd(),
    "aaTestStderr:",
    testResult.stderr.trimEnd(),
  );
  if (testResult.exitCode !== 0) {
    return {
      suiteClass: input.suiteClass,
      status: "failed",
      testsRun: 0,
      failures: 0,
      errors: 1,
      passes: 0,
      ignored: 0,
      reportCode: null,
      ok: false,
      testCases: [],
    };
  }
  const parsed = parseAaTestOutput(`${testResult.stdout}\n${testResult.stderr}`);
  if (!parsed.ok && parsed.blockedReason) {
    return {
      suiteClass: input.suiteClass,
      status: "blocked",
      testsRun: 0,
      failures: 0,
      errors: 1,
      passes: 0,
      ignored: 0,
      reportCode: null,
      ok: false,
      testCases: [],
    };
  }
  return {
    suiteClass: input.suiteClass,
    status: parsed.ok ? "passed" : "failed",
    testsRun: parsed.testsRun ?? 0,
    failures: parsed.failures ?? 0,
    errors: parsed.errors ?? 0,
    passes: parsed.passes ?? 0,
    ignored: parsed.ignored ?? 0,
    reportCode: parsed.reportCode ?? null,
    ok: parsed.ok,
    testCases: parsed.testCases ?? [],
  };
}

function buildTestCommand(
  config: MatrixConfig,
  device: MatrixConfig["devices"][number],
  testClass?: string,
): string {
  return buildAaTestCommand({
    hdc: config.paths.hdc,
    target: device.target,
    bundleName: config.bundleName,
    testModule: config.testModule,
    testRunner: config.testRunner,
    timeoutMs: config.timeoutMs,
    ...(testClass ? { testClass } : {}),
  });
}

function aggregateSuites(suiteResults: SuiteRunResult[]): Pick<
  SuiteRunResult,
  "testsRun" | "failures" | "errors" | "passes" | "ignored"
> {
  return suiteResults.reduce(
    (aggregate, suite) => ({
      testsRun: aggregate.testsRun + suite.testsRun,
      failures: aggregate.failures + suite.failures,
      errors: aggregate.errors + suite.errors,
      passes: aggregate.passes + suite.passes,
      ignored: aggregate.ignored + suite.ignored,
    }),
    { testsRun: 0, failures: 0, errors: 0, passes: 0, ignored: 0 },
  );
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

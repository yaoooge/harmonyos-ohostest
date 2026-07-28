import path from "node:path";
import {
  CommandLogger,
  defaultCommandExecutor,
  runDetachedCommand,
} from "./command.js";
import { sleep } from "./utils/sleep.js";
import { buildTestHapCommand, runBuild } from "./build.js";
import {
  buildStartEmulatorCommand,
  buildStopEmulatorCommand,
  installHaps,
  prepareDevice,
  waitForTargetDisconnected,
  writeDeviceLog,
} from "./device.js";
import { buildAaTestCommand, parseAaTestOutput } from "./ohostest.js";
import { deriveExecutionStatus } from "./result.js";
import {
  deployFoldTrigger,
  killFoldServer,
  startFoldServer,
} from "../fold/server.js";
import type { FoldServerInstance } from "../fold/server.js";
import type {
  CommandResult,
  DeviceRunResult,
  InstallArtifacts,
  ExecutionConfig,
  ExecutionResult,
  RunExecutionInput,
  SuiteRunResult,
} from "./types/index.js";

const emulatorRestartCooldownMs = 5000;

interface ExecutionRunContext {
  startedTime: number;
  startedAt: string;
  config: ExecutionConfig;
  selectedDevices: ExecutionConfig["devices"];
  outDir: string;
  diagnostics: string[];
  runCommand: (command: string) => Promise<CommandResult>;
  runDetached: (command: string) => Promise<CommandResult>;
}

interface DeviceRunInput {
  config: ExecutionConfig;
  installArtifacts: InstallArtifacts;
  device: ExecutionConfig["devices"][number];
  outDir: string;
  keepEmulators: boolean;
  runCommand: (command: string) => Promise<CommandResult>;
  runDetached: (command: string) => Promise<CommandResult>;
}

export async function runExecution(
  input: RunExecutionInput,
): Promise<ExecutionResult> {
  const context = await createExecutionRunContext(input);

  await deployDefaultFoldTriggerIfNeeded(context);

  const buildOutcome = await runBuild({
    config: context.config,
    skipBuild: input.skipBuild ?? false,
    runCommand: context.runCommand,
    diagnostics: context.diagnostics,
  });

  const devices =
    buildOutcome.result.status === "passed" && buildOutcome.installArtifacts
      ? await runSelectedDevices(context, input, buildOutcome.installArtifacts)
      : [];

  const status = deriveExecutionStatus(devices);
  const result = buildExecutionResult(
    context,
    buildOutcome.result,
    devices,
    status,
  );
  return result;
}

async function createExecutionRunContext(
  input: RunExecutionInput,
): Promise<ExecutionRunContext> {
  const startedTime = Date.now();
  const config = input.config;
  const selectedDevices = input.plan.devices;
  const outDir = path.resolve(input.outDir);
  const logger = new CommandLogger(path.join(outDir, "commands.log"));
  const executor = input.commandExecutor ?? defaultCommandExecutor;

  return {
    startedTime,
    startedAt: new Date(startedTime).toISOString(),
    config,
    selectedDevices,
    outDir,
    diagnostics: [],
    runCommand: loggedCommand(executor, logger, config.project),
    runDetached: loggedDetachedCommand(logger, config.project),
  };
}

function loggedCommand(
  executor: typeof defaultCommandExecutor,
  logger: CommandLogger,
  project: string,
): (command: string) => Promise<CommandResult> {
  return async (command) => {
    const result = await executor(command, project);
    await logger.record(command, result);
    return result;
  };
}

function loggedDetachedCommand(
  logger: CommandLogger,
  project: string,
): (command: string) => Promise<CommandResult> {
  return async (command) => {
    const result = await runDetachedCommand(command, project);
    await logger.record(command, result);
    return result;
  };
}

async function deployDefaultFoldTriggerIfNeeded(
  context: ExecutionRunContext,
): Promise<void> {
  if (context.selectedDevices.some((device) => device.foldControl)) {
    await deployFoldTrigger(
      context.config.project,
      8765,
      context.config.moduleSrcPath,
    );
  }
}

async function runSelectedDevices(
  context: ExecutionRunContext,
  input: RunExecutionInput,
  installArtifacts: InstallArtifacts,
): Promise<DeviceRunResult[]> {
  const devices: DeviceRunResult[] = [];
  for (let index = 0; index < context.selectedDevices.length; index += 1) {
    const device = context.selectedDevices[index];
    devices.push(
      await runDevice({
        ...context,
        device,
        installArtifacts,
        keepEmulators: input.keepEmulators ?? false,
      }),
    );
    if (
      shouldWaitBeforeNextEmulatorStart(
        context.selectedDevices,
        index,
        input.keepEmulators ?? false,
      )
    ) {
      await sleep(emulatorRestartCooldownMs);
    }
  }
  return devices;
}

function buildExecutionResult(
  context: ExecutionRunContext,
  build: ExecutionResult["build"],
  devices: DeviceRunResult[],
  status: ExecutionResult["status"],
): ExecutionResult {
  const finishedTime = Date.now();
  return {
    project: context.config.project,
    status,
    startedAt: context.startedAt,
    finishedAt: new Date(finishedTime).toISOString(),
    durationMs: finishedTime - context.startedTime,
    build,
    devices,
    diagnostics: context.diagnostics,
  };
}

function shouldWaitBeforeNextEmulatorStart(
  devices: ExecutionConfig["devices"],
  currentIndex: number,
  keepEmulators: boolean,
): boolean {
  return (
    !keepEmulators &&
    devices[currentIndex]?.startEmulator === true &&
    devices.slice(currentIndex + 1).some((device) => device.startEmulator)
  );
}

async function runDevice(input: DeviceRunInput): Promise<DeviceRunResult> {
  const started = Date.now();
  const logLines: string[] = [
    `device: ${input.device.id}`,
    `target: ${input.device.target}`,
  ];
  let foldServer: FoldServerInstance | undefined;

  try {
    const emulatorBlock = await startEmulatorIfNeeded(input, started, logLines);
    if (emulatorBlock) return emulatorBlock;

    await prepareRunDevice(input);

    const foldResult = await startFoldSupportIfNeeded(input, started, logLines);
    if (foldResult.blocked) return foldResult.blocked;
    foldServer = foldResult.foldServer;

    await installRunHaps(input);
    const suiteResults = await runDeviceSuites(input, started, logLines);
    if (isBlockedDeviceResult(suiteResults)) return suiteResults;

    return await passedDevice(
      input,
      started,
      logLines,
      suiteResults,
      foldServer,
    );
  } catch (error) {
    const reason = reasonFromError(error);
    return blockedDevice(input, started, [...logLines, String(error)], reason);
  } finally {
    await cleanupRunDevice(input, foldServer);
  }
}

async function startEmulatorIfNeeded(
  input: DeviceRunInput,
  started: number,
  logLines: string[],
): Promise<DeviceRunResult | undefined> {
  if (!input.device.startEmulator) return undefined;
  const start = await input.runDetached(
    buildStartEmulatorCommand(input.config, input.device),
  );
  logLines.push(`emulatorStartExitCode: ${start.exitCode}`);
  return start.exitCode === 0
    ? undefined
    : blockedDevice(input, started, logLines, "emulator_start_failed");
}

async function prepareRunDevice(input: DeviceRunInput): Promise<void> {
  await prepareDevice({
    config: input.config,
    device: input.device,
    cwd: input.config.project,
    outDir: input.outDir,
    runCommand: input.runCommand,
  });
}

async function startFoldSupportIfNeeded(
  input: DeviceRunInput,
  started: number,
  logLines: string[],
): Promise<{ foldServer?: FoldServerInstance; blocked?: DeviceRunResult }> {
  if (!input.device.foldControl || !input.config.paths.foldServerScript) {
    return {};
  }
  try {
    const foldServer = await startFoldServer(
      input.device,
      input.config.paths.foldServerScript,
    );
    await deployDeviceFoldTrigger(input, foldServer, logLines);
    return { foldServer };
  } catch (error) {
    logLines.push(
      `foldServerError: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      blocked: await blockedDevice(
        input,
        started,
        logLines,
        "fold_server_start_failed",
      ),
    };
  }
}

async function deployDeviceFoldTrigger(
  input: DeviceRunInput,
  foldServer: FoldServerInstance,
  logLines: string[],
): Promise<void> {
  logLines.push(`foldServerPort: ${foldServer.port}`);
  const triggerPath = await deployFoldTrigger(
    input.config.project,
    foldServer.devicePort,
    input.config.moduleSrcPath,
  );
  logLines.push(`deployedFoldTrigger: ${triggerPath}`);
  const buildResult = await input.runCommand(buildTestHapCommand(input.config));
  logLines.push(`foldTestBuildExitCode: ${buildResult.exitCode}`);
  if (buildResult.exitCode !== 0) {
    logLines.push(`foldTestBuildStderr: ${buildResult.stderr.trimEnd()}`);
  }
}

async function installRunHaps(input: DeviceRunInput): Promise<void> {
  await installHaps(
    {
      config: input.config,
      device: input.device,
      cwd: input.config.project,
      outDir: input.outDir,
      runCommand: input.runCommand,
    },
    input.installArtifacts,
  );
}

async function runDeviceSuites(
  input: DeviceRunInput,
  started: number,
  logLines: string[],
): Promise<SuiteRunResult[] | DeviceRunResult> {
  const suiteClasses = selectedSuiteClasses(input);
  if (suiteClasses.length === 0) {
    return runAllSuites(input, started, logLines);
  }

  const suiteResults: SuiteRunResult[] = [];
  for (const suiteClass of suiteClasses) {
    suiteResults.push(await runSuite({ ...input, suiteClass, logLines }));
  }
  return suiteResults;
}

function selectedSuiteClasses(input: DeviceRunInput): string[] {
  if (input.config.testClass) {
    return [input.config.testClass];
  }
  return input.device.testClasses && input.device.testClasses.length > 0
    ? input.device.testClasses
    : [];
}

async function runAllSuites(
  input: DeviceRunInput,
  started: number,
  logLines: string[],
): Promise<SuiteRunResult[] | DeviceRunResult> {
  const testResult = await input.runCommand(
    buildTestCommand(input.config, input.device),
  );
  logLines.push(
    "aaTestStdout:",
    testResult.stdout.trimEnd(),
    "aaTestStderr:",
    testResult.stderr.trimEnd(),
  );
  if (testResult.exitCode !== 0) {
    return blockedDevice(input, started, logLines, "test_command_failed");
  }
  const parsed = parseAaTestOutput(
    `${testResult.stdout}\n${testResult.stderr}`,
  );
  if (!parsed.ok && parsed.blockedReason) {
    return blockedDevice(input, started, logLines, parsed.blockedReason);
  }
  return [suiteResultFromParsed("ALL", parsed)];
}

function isBlockedDeviceResult(
  result: SuiteRunResult[] | DeviceRunResult,
): result is DeviceRunResult {
  return !Array.isArray(result);
}

async function passedDevice(
  input: DeviceRunInput,
  started: number,
  logLines: string[],
  suiteResults: SuiteRunResult[],
  foldServer?: FoldServerInstance,
): Promise<DeviceRunResult> {
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
    status: suiteResults.some((suite) => suite.status !== "passed")
      ? "failed"
      : "passed",
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
}

async function cleanupRunDevice(
  input: DeviceRunInput,
  foldServer: FoldServerInstance | undefined,
): Promise<void> {
  if (foldServer) {
    killFoldServer(foldServer);
  }
  if (!input.device.startEmulator || input.keepEmulators) {
    return;
  }
  await input.runDetached(buildStopEmulatorCommand(input.config, input.device));
  await waitForTargetDisconnected({
    config: input.config,
    device: input.device,
    cwd: input.config.project,
    outDir: input.outDir,
    runCommand: input.runCommand,
  });
}

async function blockedDevice(
  input: Pick<DeviceRunInput, "device" | "outDir">,
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
  config: ExecutionConfig;
  device: ExecutionConfig["devices"][number];
  suiteClass: string;
  logLines: string[];
  runCommand: (command: string) => Promise<CommandResult>;
}): Promise<SuiteRunResult> {
  input.logLines.push(`suiteClass: ${input.suiteClass}`);
  const testResult = await input.runCommand(
    buildTestCommand(input.config, input.device, input.suiteClass),
  );
  input.logLines.push(
    `aaTestClass: ${input.suiteClass}`,
    "aaTestStdout:",
    testResult.stdout.trimEnd(),
    "aaTestStderr:",
    testResult.stderr.trimEnd(),
  );
  if (testResult.exitCode !== 0) {
    return emptySuiteResult(input.suiteClass, "failed");
  }
  const parsed = parseAaTestOutput(
    `${testResult.stdout}\n${testResult.stderr}`,
  );
  if (!parsed.ok && parsed.blockedReason) {
    return emptySuiteResult(input.suiteClass, "blocked");
  }
  return suiteResultFromParsed(input.suiteClass, parsed);
}

function emptySuiteResult(
  suiteClass: string,
  status: SuiteRunResult["status"],
): SuiteRunResult {
  return {
    suiteClass,
    status,
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

function suiteResultFromParsed(
  suiteClass: string,
  parsed: ReturnType<typeof parseAaTestOutput>,
): SuiteRunResult {
  return {
    suiteClass,
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
  config: ExecutionConfig,
  device: ExecutionConfig["devices"][number],
  testClass?: string,
): string {
  return buildAaTestCommand({
    hdc: config.paths.hdc,
    target: device.target,
    bundleName: config.bundleName,
    testModule: config.testModule,
    testRunner: config.testRunner,
    testCaseTimeoutMs: config.testCaseTimeoutMs,
    timeoutMs: config.timeoutMs,
    ...(testClass ? { testClass } : {}),
  });
}

function aggregateSuites(
  suiteResults: SuiteRunResult[],
): Pick<
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

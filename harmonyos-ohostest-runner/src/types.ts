export type MatrixStatus = "completed" | "failed";

export type DeviceRunStatus = "passed" | "failed" | "blocked";

export type BlockedReason =
  | "emulator_start_failed"
  | "hdc_not_connected"
  | "install_failed"
  | "test_command_failed"
  | "test_output_unparseable";

export interface RawMatrixConfig {
  product?: string;
  module?: string;
  bundleName?: string;
  testModule?: string;
  testRunner?: string;
  testClass?: string;
  testFolders?: Record<string, unknown>;
  timeoutMs?: number;
  build?: {
    mode?: string;
    appTask?: string;
    testTask?: string;
  };
  paths?: {
    hvigorw?: string;
    hdc?: string;
    emulatorBin?: string;
    emulatorDeployedDir?: string;
  };
  artifacts?: {
    appHap?: string;
    testHap?: string;
  };
  devices?: RawDeviceConfig[];
}

export interface RawDeviceConfig {
  id?: string;
  profile?: string;
  target?: string;
  hdcPort?: number;
  startEmulator?: boolean;
  testFolders?: unknown;
}

export interface MatrixConfig {
  project: string;
  product: string;
  module: string;
  bundleName: string;
  testModule: string;
  testRunner: string;
  testClass?: string;
  testFolders: Record<string, string>;
  timeoutMs: number;
  build: {
    mode: string;
    appTask: string;
    testTask: string;
  };
  paths: {
    hvigorw: string;
    hdc: string;
    emulatorBin: string;
    emulatorDeployedDir: string;
  };
  artifacts: {
    appHap: string;
    testHap: string;
  };
  devices: DeviceConfig[];
}

export interface DeviceConfig {
  id: string;
  profile?: string;
  target: string;
  hdcPort?: number;
  startEmulator: boolean;
  testClasses?: string[];
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export type CommandExecutor = (command: string, cwd: string) => Promise<CommandResult>;

export interface ParsedAaTestOutput {
  ok: boolean;
  testsRun?: number;
  failures?: number;
  errors?: number;
  passes?: number;
  ignored?: number;
  reportCode?: number;
  testCases?: TestCaseRunResult[];
  blockedReason?: BlockedReason;
}

export interface BuildResult {
  status: "passed" | "blocked";
  appHap: string;
  testHap: string;
  durationMs?: number;
  blockedReason?: string;
}

export type SuiteRunStatus = "passed" | "failed" | "blocked";

export type TestCaseRunStatus = "passed" | "failed" | "ignored" | "running";

export interface TestCaseRunResult {
  name: string;
  status: TestCaseRunStatus;
  statusCode: number;
}

export interface SuiteRunResult {
  suiteClass: string;
  status: SuiteRunStatus;
  testsRun: number;
  failures: number;
  errors: number;
  passes: number;
  ignored: number;
  reportCode: number | null;
  ok: boolean;
  testCases: TestCaseRunResult[];
  outputFile?: string;
}

export interface DeviceRunResult {
  id: string;
  profile?: string;
  target: string;
  status: DeviceRunStatus;
  testsRun: number;
  failures: number;
  errors: number;
  passes: number;
  ignored: number;
  reportCode?: number;
  suiteResults: SuiteRunResult[];
  durationMs: number;
  log: string;
  blockedReason?: BlockedReason;
}

export interface MatrixResult {
  schemaVersion: "ohostest-matrix-v1";
  project: string;
  status: MatrixStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  build: BuildResult;
  devices: DeviceRunResult[];
  artifacts: {
    commandLog: string;
    summary: string;
  };
  diagnostics: string[];
}

export interface RunMatrixInput {
  project: string;
  machineConfigPath?: string;
  out?: string;
  devices?: string[];
  testClass?: string;
  skipBuild?: boolean;
  keepEmulators?: boolean;
  commandExecutor?: CommandExecutor;
}

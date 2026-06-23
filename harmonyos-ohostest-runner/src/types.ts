export type MatrixStatus = "passed" | "failed" | "blocked" | "partial";

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
}

export interface MatrixConfig {
  project: string;
  product: string;
  module: string;
  bundleName: string;
  testModule: string;
  testRunner: string;
  testClass?: string;
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
  blockedReason?: BlockedReason;
}

export interface BuildResult {
  status: "passed" | "blocked";
  appHap: string;
  testHap: string;
  durationMs?: number;
  blockedReason?: string;
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

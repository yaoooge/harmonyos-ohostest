import type { CommandExecutor } from "../../shared/types/index.js";
import type { MatrixResult } from "../../matrix/types/index.js";

export interface RunCaseInput {
  caseDir: string;
  machineConfigPath?: string;
  out?: string;
  skipBuild?: boolean;
  keepEmulators?: boolean;
  keepWorkdir?: boolean;
  commandExecutor?: CommandExecutor;
}

export interface CaseDeviceSuite {
  suite: string;
  file?: string;
}

export interface CaseMetadata {
  caseId: string;
  caseDir: string;
  baseProject: string;
  testPatch: string;
  goldenPatch: string;
  failToPass: string[];
  passToPass: string[];
  deviceTestSuites?: Record<string, CaseDeviceSuite[]>;
  enabledDevices?: string[];
}

export interface CaseDeviceSelection {
  devices: string[];
  deviceSuiteOverrides?: Record<string, string[]>;
  runAllTests: boolean;
}

export type CaseStatus = "completed" | "failed";

export interface CaseResult {
  schemaVersion: "ohostest-case-v1";
  caseId: string;
  caseDir: string;
  baseProject: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: CaseStatus;
  metadata: {
    failToPass: string[];
    passToPass: string[];
    deviceTestSuites: Record<string, CaseDeviceSuite[]>;
    enabledDevices?: string[];
  };
  runs: {
    swe?: MatrixResult;
    answer?: MatrixResult;
  };
  artifacts: {
    result: string;
    summary: string;
    sweResult?: string;
    answerResult?: string;
    workdir?: string;
  };
  diagnostics: string[];
}

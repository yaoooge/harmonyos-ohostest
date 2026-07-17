import fs from "node:fs/promises";
import path from "node:path";
import { loadMatrixConfig } from "../matrix/config.js";
import { runOhosTestMatrix } from "../matrix/runner.js";
import { CommandLogger, defaultCommandExecutor } from "../shared/command.js";
import type { CommandResult } from "../shared/types/index.js";
import { buildCaseDeviceSelection, loadCaseMetadata } from "./config.js";
import { applyPatch, copyBaseProject } from "./patch.js";
import {
  deriveCaseStatus,
  metadataForResult,
  renderCaseSummary,
} from "./result.js";
import type {
  CaseDeviceSelection,
  CaseMetadata,
  CaseResult,
  RunCaseInput,
} from "./types/index.js";
import { withSweTabletCompatibility } from "./deviceCompatibility.js";

interface CaseRunContext {
  startedTime: number;
  startedAt: string;
  metadata: CaseMetadata;
  outDir: string;
  out: string;
  workProject: string;
  diagnostics: string[];
  runs: CaseResult["runs"];
  logger: CommandLogger;
}

export async function runOhosTestCase(
  input: RunCaseInput,
): Promise<CaseResult> {
  const context = await createCaseRunContext(input);

  try {
    await runCaseComparisons(input, context);
  } catch (error) {
    context.diagnostics.push(
      error instanceof Error ? error.message : String(error),
    );
  }

  const result = buildCaseResult(input, context);
  await writeCaseArtifacts(result, context);
  await cleanupCaseWorkdir(input, context, result);
  return result;
}

async function runCaseComparisons(
  input: RunCaseInput,
  context: CaseRunContext,
): Promise<void> {
  const runMode = input.runMode ?? "answer";
  const runPatchCommand = loggedPatchCommand(context);
  await copyBaseProject({
    baseProject: context.metadata.baseProject,
    workProject: context.workProject,
  });
  await applyPatch({
    project: context.workProject,
    patchFile: context.metadata.testPatch,
    label: "test_patch",
    commandExecutor: runPatchCommand,
  });

  const matrixConfig = await loadMatrixConfig({
    project: context.workProject,
    machineConfigPath: input.machineConfigPath,
  });
  const deviceSelection = buildCaseDeviceSelection(
    context.metadata,
    matrixConfig,
    input.devices,
  );
  if (runMode === "swe" || runMode === "all") {
    context.runs.swe = await withSweTabletCompatibility({
      project: context.workProject,
      enabled: deviceSelection.devices.includes("tablet"),
      run: () => runCaseMatrix(input, context, deviceSelection, "swe"),
    });
  }

  if (runMode === "answer" || runMode === "all") {
    await applyPatch({
      project: context.workProject,
      patchFile: context.metadata.goldenPatch,
      label: "golden_patch",
      commandExecutor: runPatchCommand,
    });
    context.runs.answer = await runCaseMatrix(
      input,
      context,
      deviceSelection,
      "answer",
    );
  }
}

function loggedPatchCommand(
  context: CaseRunContext,
): (command: string) => Promise<CommandResult> {
  return async (command) => {
    const result = await defaultCommandExecutor(command, context.workProject);
    await context.logger.record(command, result);
    return result;
  };
}

async function createCaseRunContext(
  input: RunCaseInput,
): Promise<CaseRunContext> {
  const startedTime = Date.now();
  const metadata = await loadCaseMetadata(input.caseDir);
  const outDir = resolveOutDir(input, metadata, startedTime);
  const context: CaseRunContext = {
    startedTime,
    startedAt: new Date(startedTime).toISOString(),
    metadata,
    outDir,
    out: path.join(outDir, "result.json"),
    workProject: path.join(outDir, "work", "project"),
    diagnostics: [],
    runs: {},
    logger: new CommandLogger(
      path.join(outDir, "commands.log"),
      "# ohosTest case command log\n",
    ),
  };
  await fs.mkdir(outDir, { recursive: true });
  return context;
}

function resolveOutDir(
  input: RunCaseInput,
  metadata: CaseMetadata,
  startedTime: number,
): string {
  return path.resolve(
    input.out ??
      path.join(
        metadata.caseDir,
        ".ohostest-runs",
        timestampForPath(new Date(startedTime)),
      ),
  );
}

async function runCaseMatrix(
  input: RunCaseInput,
  context: CaseRunContext,
  deviceSelection: CaseDeviceSelection,
  phase: "swe" | "answer",
): Promise<NonNullable<CaseResult["runs"]["swe"]>> {
  return runOhosTestMatrix({
    project: context.workProject,
    machineConfigPath: input.machineConfigPath,
    out: path.join(context.outDir, phase, "result.json"),
    devices: deviceSelection.devices,
    skipBuild: input.skipBuild,
    keepEmulators: input.keepEmulators,
    commandExecutor: input.commandExecutor,
    deviceSuiteOverrides: deviceSelection.deviceSuiteOverrides,
    ignoreMachineDeviceSuites: deviceSelection.runAllTests,
  });
}

function buildCaseResult(
  input: RunCaseInput,
  context: CaseRunContext,
): CaseResult {
  const status = deriveCaseStatus(context.runs, context.diagnostics);
  const finishedTime = Date.now();
  return {
    schemaVersion: "ohostest-case-v1",
    caseId: context.metadata.caseId,
    caseDir: context.metadata.caseDir,
    baseProject: context.metadata.baseProject,
    startedAt: context.startedAt,
    finishedAt: new Date(finishedTime).toISOString(),
    durationMs: finishedTime - context.startedTime,
    status,
    metadata: metadataForResult(context.metadata),
    runs: context.runs,
    artifacts: buildCaseArtifacts(input, context),
    diagnostics: context.diagnostics,
  };
}

function buildCaseArtifacts(
  input: RunCaseInput,
  context: CaseRunContext,
): CaseResult["artifacts"] {
  return {
    result: relativeToCaseDir(context, context.out),
    summary: relativeToCaseDir(
      context,
      path.join(context.outDir, "summary.md"),
    ),
    commandLog: relativeToCaseDir(
      context,
      path.join(context.outDir, "commands.log"),
    ),
    ...(context.runs.swe
      ? {
          sweResult: relativeToCaseDir(
            context,
            path.join(context.outDir, "swe", "result.json"),
          ),
        }
      : {}),
    ...(context.runs.answer
      ? {
          answerResult: relativeToCaseDir(
            context,
            path.join(context.outDir, "answer", "result.json"),
          ),
        }
      : {}),
    ...(input.keepWorkdir ? { workdir: context.workProject } : {}),
  };
}

function relativeToCaseDir(context: CaseRunContext, target: string): string {
  return path.relative(context.metadata.caseDir, target);
}

async function writeCaseArtifacts(
  result: CaseResult,
  context: CaseRunContext,
): Promise<void> {
  await fs.writeFile(
    path.join(context.outDir, "summary.md"),
    renderCaseSummary(result),
    "utf-8",
  );
  await fs.writeFile(
    context.out,
    `${JSON.stringify(result, null, 2)}\n`,
    "utf-8",
  );
}

async function cleanupCaseWorkdir(
  input: RunCaseInput,
  context: CaseRunContext,
  result: CaseResult,
): Promise<void> {
  if (!input.keepWorkdir) {
    try {
      await fs.rm(path.join(context.outDir, "work"), {
        recursive: true,
        force: true,
      });
    } catch (error) {
      result.diagnostics.push(
        `cleanup_failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      await fs.writeFile(
        context.out,
        `${JSON.stringify(result, null, 2)}\n`,
        "utf-8",
      );
    }
  }
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

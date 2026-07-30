import fs from "node:fs/promises";
import path from "node:path";
import { loadExecutionConfig } from "../execution/config.js";
import { buildExecutionPlan } from "../execution/plan.js";
import { runExecution } from "../execution/runner.js";
import { renderSummaryMarkdown } from "../execution/summary.js";
import { defaultCommandExecutor } from "../execution/command.js";
import { createLoggedCommandExecutor } from "../logging/command.js";
import { RunnerLogger } from "../logging/logger.js";
import { formatRunnerError } from "../logging/types.js";
import type {
  CommandResult,
  ExecutionConfig,
} from "../execution/types/index.js";
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
  logger: RunnerLogger;
}

interface CaseRunBootstrap {
  startedTime: number;
  caseDir: string;
  outDir: string;
  logger: RunnerLogger;
}

export async function runOhosTestCase(
  input: RunCaseInput,
): Promise<CaseResult> {
  const startedTime = Date.now();
  const caseDir = path.resolve(input.caseDir);
  const outDir = resolveOutDir(input, caseDir, startedTime);
  await fs.mkdir(outDir, { recursive: true });
  const logger = RunnerLogger.create(path.join(outDir, "commands.jsonl"), {
    phase: "case",
  });

  try {
    return await runCaseWithLogger(input, {
      startedTime,
      caseDir,
      outDir,
      logger,
    });
  } catch (error) {
    logger.recordError(error);
    throw error;
  } finally {
    await logger.close();
  }
}

async function runCaseWithLogger(
  input: RunCaseInput,
  bootstrap: CaseRunBootstrap,
): Promise<CaseResult> {
  let metadata: CaseMetadata;
  try {
    metadata = await loadCaseMetadata(bootstrap.caseDir);
  } catch (error) {
    bootstrap.logger.recordError(error);
    const result = failedCaseResult(
      input,
      bootstrap.caseDir,
      bootstrap.outDir,
      bootstrap.startedTime,
      error,
    );
    await writeFailedCaseArtifacts(result, bootstrap.outDir);
    return result;
  }
  const context = createCaseRunContext(
    input,
    bootstrap.startedTime,
    bootstrap.outDir,
    metadata,
    bootstrap.logger,
  );
  try {
    await runCaseComparisons(input, context);
  } catch (error) {
    context.diagnostics.push(formatRunnerError(error));
    context.logger.recordError(error);
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
  const runPatchCommand = loggedPatchCommand(input, context);
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

  const { executionConfig, deviceSelection } = await prepareCaseExecution(
    input,
    context,
  );
  if (runMode === "swe" || runMode === "all") {
    context.runs.swe = await withSweTabletCompatibility({
      project: context.workProject,
      enabled: deviceSelection.devices.includes("tablet"),
      run: () =>
        runCaseExecution(
          input,
          context,
          executionConfig,
          deviceSelection,
          "swe",
        ),
    });
  }

  if (runMode === "answer" || runMode === "all") {
    await applyPatch({
      project: context.workProject,
      patchFile: context.metadata.goldenPatch,
      label: "golden_patch",
      commandExecutor: runPatchCommand,
    });
    context.runs.answer = await runCaseExecution(
      input,
      context,
      executionConfig,
      deviceSelection,
      "answer",
    );
  }
}

async function prepareCaseExecution(
  input: RunCaseInput,
  context: CaseRunContext,
): Promise<{
  executionConfig: ExecutionConfig;
  deviceSelection: CaseDeviceSelection;
}> {
  const executionConfig = await loadExecutionConfig({
    project: context.workProject,
    machineConfigPath: input.machineConfigPath,
    testCaseTimeoutMs: context.metadata.testCaseTimeoutMs,
  });
  return {
    executionConfig,
    deviceSelection: buildCaseDeviceSelection(
      context.metadata,
      executionConfig,
      input.devices,
    ),
  };
}

function loggedPatchCommand(
  input: RunCaseInput,
  context: CaseRunContext,
): (command: string) => Promise<CommandResult> {
  const logged = createLoggedCommandExecutor(
    input.patchCommandExecutor ?? defaultCommandExecutor,
    context.logger,
    context.workProject,
  );
  return (command) => logged(command, context.workProject);
}

function createCaseRunContext(
  input: RunCaseInput,
  startedTime: number,
  outDir: string,
  metadata: CaseMetadata,
  logger: RunnerLogger,
): CaseRunContext {
  return {
    startedTime,
    startedAt: new Date(startedTime).toISOString(),
    metadata,
    outDir,
    out: path.join(outDir, "result.json"),
    workProject: path.join(outDir, "work", "project"),
    diagnostics: [],
    runs: {},
    logger,
  };
}

function resolveOutDir(
  input: RunCaseInput,
  caseDir: string,
  startedTime: number,
): string {
  return path.resolve(
    input.out ??
      path.join(
        caseDir,
        ".ohostest-runs",
        timestampForPath(new Date(startedTime)),
      ),
  );
}

async function runCaseExecution(
  input: RunCaseInput,
  context: CaseRunContext,
  executionConfig: ExecutionConfig,
  deviceSelection: CaseDeviceSelection,
  phase: "swe" | "answer",
): Promise<NonNullable<CaseResult["runs"]["swe"]>> {
  const outDir = path.join(context.outDir, phase);
  await fs.mkdir(outDir, { recursive: true });
  const execution = await runExecution({
    config: executionConfig,
    plan: buildExecutionPlan(executionConfig, {
      devices: deviceSelection.devices,
      suitesByDevice: deviceSelection.deviceSuiteOverrides,
      runAllTests: deviceSelection.runAllTests,
    }),
    outDir,
    skipBuild: input.skipBuild,
    keepEmulators: input.keepEmulators,
    commandExecutor: input.commandExecutor,
    logger: context.logger.child({ phase }),
  });
  const result: NonNullable<CaseResult["runs"]["swe"]> = {
    schemaVersion: "ohostest-matrix-v1",
    ...execution,
    artifacts: {
      commandLog: "../commands.jsonl",
      summary: "summary.md",
    },
  };
  await fs.writeFile(
    path.join(outDir, "summary.md"),
    renderSummaryMarkdown(result.status, result.devices),
    "utf-8",
  );
  await fs.writeFile(
    path.join(outDir, "result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf-8",
  );
  return result;
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
    commandLog: "commands.jsonl",
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

function failedCaseResult(
  input: RunCaseInput,
  caseDir: string,
  outDir: string,
  startedTime: number,
  error: unknown,
): CaseResult {
  const finishedTime = Date.now();
  const message = formatRunnerError(error);
  return {
    schemaVersion: "ohostest-case-v1",
    caseId: path.basename(caseDir),
    caseDir,
    baseProject: "",
    startedAt: new Date(startedTime).toISOString(),
    finishedAt: new Date(finishedTime).toISOString(),
    durationMs: finishedTime - startedTime,
    status: "failed",
    metadata: {
      testCaseTimeoutMs: 0,
      failToPass: [],
      passToPass: [],
      deviceTestSuites: {},
    },
    runs: {},
    artifacts: {
      result: path.relative(caseDir, path.join(outDir, "result.json")),
      summary: path.relative(caseDir, path.join(outDir, "summary.md")),
      commandLog: "commands.jsonl",
      ...(input.keepWorkdir
        ? { workdir: path.join(outDir, "work", "project") }
        : {}),
    },
    diagnostics: [message],
  };
}

async function writeFailedCaseArtifacts(
  result: CaseResult,
  outDir: string,
): Promise<void> {
  await fs.writeFile(
    path.join(outDir, "summary.md"),
    renderCaseSummary(result),
    "utf-8",
  );
  await fs.writeFile(
    path.join(outDir, "result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf-8",
  );
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

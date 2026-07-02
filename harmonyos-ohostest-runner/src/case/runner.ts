import fs from "node:fs/promises";
import path from "node:path";
import { loadMatrixConfig } from "../matrix/config.js";
import { runOhosTestMatrix } from "../matrix/runner.js";
import { defaultCommandExecutor } from "../shared/command.js";
import { buildCaseDeviceSelection, loadCaseMetadata } from "./config.js";
import { applyPatch, copyBaseProject } from "./patch.js";
import {
  deriveCaseStatus,
  metadataForResult,
  renderCaseSummary,
} from "./result.js";
import type { CaseResult, RunCaseInput } from "./types/index.js";

export async function runOhosTestCase(
  input: RunCaseInput,
): Promise<CaseResult> {
  const startedTime = Date.now();
  const startedAt = new Date(startedTime).toISOString();
  const metadata = await loadCaseMetadata(input.caseDir);
  const out = path.resolve(
    input.out ??
      path.join(
        metadata.caseDir,
        ".ohostest-runs",
        timestampForPath(new Date(startedTime)),
        "result.json",
      ),
  );
  const outDir = path.dirname(out);
  const workProject = path.join(outDir, "work", "project");
  const diagnostics: string[] = [];
  const runs: CaseResult["runs"] = {};

  await fs.mkdir(outDir, { recursive: true });

  try {
    await copyBaseProject({
      baseProject: metadata.baseProject,
      workProject,
    });
    await applyPatch({
      project: workProject,
      patchFile: metadata.testPatch,
      label: "test_patch",
    });
    await installDependencies(workProject, input.commandExecutor);

    const matrixConfig = await loadMatrixConfig({
      project: workProject,
      machineConfigPath: input.machineConfigPath,
    });
    const deviceSelection = buildCaseDeviceSelection(metadata, matrixConfig);

    runs.swe = await runOhosTestMatrix({
      project: workProject,
      machineConfigPath: input.machineConfigPath,
      out: path.join(outDir, "swe", "result.json"),
      devices: deviceSelection.devices,
      skipBuild: input.skipBuild,
      keepEmulators: input.keepEmulators,
      commandExecutor: input.commandExecutor,
      deviceSuiteOverrides: deviceSelection.deviceSuiteOverrides,
      ignoreMachineDeviceSuites: deviceSelection.runAllTests,
    });

    await applyPatch({
      project: workProject,
      patchFile: metadata.goldenPatch,
      label: "golden_patch",
    });
    await installDependencies(workProject, input.commandExecutor);

    runs.answer = await runOhosTestMatrix({
      project: workProject,
      machineConfigPath: input.machineConfigPath,
      out: path.join(outDir, "answer", "result.json"),
      devices: deviceSelection.devices,
      skipBuild: input.skipBuild,
      keepEmulators: input.keepEmulators,
      commandExecutor: input.commandExecutor,
      deviceSuiteOverrides: deviceSelection.deviceSuiteOverrides,
      ignoreMachineDeviceSuites: deviceSelection.runAllTests,
    });
  } catch (error) {
    diagnostics.push(error instanceof Error ? error.message : String(error));
  }

  const status = deriveCaseStatus(runs, diagnostics);
  const finishedTime = Date.now();
  const result: CaseResult = {
    schemaVersion: "ohostest-case-v1",
    caseId: metadata.caseId,
    caseDir: metadata.caseDir,
    baseProject: metadata.baseProject,
    startedAt,
    finishedAt: new Date(finishedTime).toISOString(),
    durationMs: finishedTime - startedTime,
    status,
    metadata: metadataForResult(metadata),
    runs,
    artifacts: {
      result: path.relative(metadata.caseDir, out),
      summary: path.relative(metadata.caseDir, path.join(outDir, "summary.md")),
      ...(runs.swe
        ? {
            sweResult: path.relative(
              metadata.caseDir,
              path.join(outDir, "swe", "result.json"),
            ),
          }
        : {}),
      ...(runs.answer
        ? {
            answerResult: path.relative(
              metadata.caseDir,
              path.join(outDir, "answer", "result.json"),
            ),
          }
        : {}),
      ...(input.keepWorkdir ? { workdir: workProject } : {}),
    },
    diagnostics,
  };

  await fs.writeFile(
    path.join(outDir, "summary.md"),
    renderCaseSummary(result),
    "utf-8",
  );
  await fs.writeFile(out, `${JSON.stringify(result, null, 2)}\n`, "utf-8");

  if (!input.keepWorkdir) {
    try {
      await fs.rm(path.join(outDir, "work"), { recursive: true, force: true });
    } catch (error) {
      result.diagnostics.push(
        `cleanup_failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      await fs.writeFile(out, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
    }
  }

  return result;
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function installDependencies(
  project: string,
  commandExecutor: RunCaseInput["commandExecutor"],
): Promise<void> {
  const executor = commandExecutor ?? defaultCommandExecutor;
  const result = await executor("ohpm install", project);
  if (result.exitCode !== 0) {
    throw new Error(
      `dependency_install_failed: ${result.stderr || result.stdout}`,
    );
  }
}

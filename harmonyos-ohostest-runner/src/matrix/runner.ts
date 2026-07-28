import fs from "node:fs/promises";
import path from "node:path";
import { loadExecutionConfig } from "../execution/config.js";
import { buildExecutionPlan } from "../execution/plan.js";
import { runExecution } from "../execution/runner.js";
import { renderSummaryMarkdown } from "./result.js";
import type { MatrixResult, RunMatrixInput } from "./types/index.js";

export async function runOhosTestMatrix(
  input: RunMatrixInput,
): Promise<MatrixResult> {
  const startedTime = Date.now();
  const config = await loadExecutionConfig({
    project: input.project,
    machineConfigPath: input.machineConfigPath,
    testClass: input.testClass,
    testCaseTimeoutMs: input.testCaseTimeoutMs,
  });
  const out = resolveMatrixOut(input, config.project, startedTime);
  const outDir = path.dirname(out);
  await fs.mkdir(outDir, { recursive: true });
  const execution = await runExecution({
    config,
    plan: buildExecutionPlan(config, {
      devices: input.devices,
      testClass: input.testClass ?? config.testClass,
    }),
    outDir,
    skipBuild: input.skipBuild,
    keepEmulators: input.keepEmulators,
    commandExecutor: input.commandExecutor,
  });
  const result: MatrixResult = {
    schemaVersion: "ohostest-matrix-v1",
    ...execution,
    artifacts: {
      commandLog: "commands.log",
      summary: "summary.md",
    },
  };
  await fs.writeFile(
    path.join(outDir, "summary.md"),
    renderSummaryMarkdown(result.status, result.devices),
    "utf-8",
  );
  await fs.writeFile(out, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  return result;
}

function resolveMatrixOut(
  input: RunMatrixInput,
  project: string,
  startedTime: number,
): string {
  return path.resolve(
    input.out ??
      path.join(
        project,
        ".ohostest-runs",
        timestampForPath(new Date(startedTime)),
        "result.json",
      ),
  );
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

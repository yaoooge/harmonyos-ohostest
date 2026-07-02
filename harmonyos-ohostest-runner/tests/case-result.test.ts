import assert from "node:assert/strict";
import test from "node:test";
import { renderCaseSummary } from "../src/case/result.js";
import type { CaseResult } from "../src/index.js";
import type { DeviceRunResult, MatrixResult, SuiteRunResult } from "../src/matrix/types/index.js";

function suite(
  suiteClass: string,
  status: SuiteRunResult["status"],
  testsRun: number,
  failures: number,
): SuiteRunResult {
  return {
    suiteClass,
    status,
    testsRun,
    failures,
    errors: 0,
    passes: testsRun - failures,
    ignored: 0,
    reportCode: failures === 0 ? 0 : -1,
    ok: failures === 0,
    testCases: [],
  };
}

function device(id: string, suiteResults: SuiteRunResult[]): DeviceRunResult {
  const totals = suiteResults.reduce(
    (aggregate, item) => ({
      testsRun: aggregate.testsRun + item.testsRun,
      failures: aggregate.failures + item.failures,
      errors: aggregate.errors + item.errors,
      passes: aggregate.passes + item.passes,
      ignored: aggregate.ignored + item.ignored,
    }),
    { testsRun: 0, failures: 0, errors: 0, passes: 0, ignored: 0 },
  );
  return {
    id,
    target: `127.0.0.1:${id}`,
    status: totals.failures === 0 && totals.errors === 0 ? "passed" : "failed",
    ...totals,
    suiteResults,
    durationMs: 1,
    log: `${id}.log`,
  };
}

function matrix(devices: DeviceRunResult[]): MatrixResult {
  return {
    schemaVersion: "ohostest-matrix-v1",
    project: "/tmp/project",
    status: "completed",
    startedAt: "2026-07-02T00:00:00.000Z",
    finishedAt: "2026-07-02T00:00:01.000Z",
    durationMs: 1,
    build: {
      status: "passed",
      appHap: "/tmp/app.hap",
      testHap: "/tmp/test.hap",
    },
    devices,
    artifacts: {
      commandLog: "commands.log",
      summary: "summary.md",
    },
    diagnostics: [],
  };
}

test("renderCaseSummary splits pass_to_pass and fail_to_pass for every device", () => {
  const summary = renderCaseSummary({
    schemaVersion: "ohostest-case-v1",
    caseId: "responsive-repeat-layout",
    caseDir: "/tmp/case",
    baseProject: "/tmp/case/task",
    startedAt: "2026-07-02T00:00:00.000Z",
    finishedAt: "2026-07-02T00:00:01.000Z",
    durationMs: 1,
    status: "completed",
    metadata: {
      passToPass: ["should_launch", "should_keep_sm"],
      failToPass: ["should_adapt_md", "should_adapt_lg"],
      deviceTestSuites: {
        phone: [{ suite: "CommonPassToPassTest" }, { suite: "SmPassToPassTest" }],
        foldable: [
          { suite: "CommonPassToPassTest" },
          { suite: "SmPassToPassTest" },
          { suite: "MdFailToPassTest" },
        ],
        tablet: [{ suite: "CommonPassToPassTest" }, { suite: "LgFailToPassTest" }],
      },
    },
    runs: {
      swe: matrix([
        device("phone", [
          suite("CommonPassToPassTest", "passed", 8, 0),
          suite("SmPassToPassTest", "passed", 3, 0),
        ]),
        device("foldable", [
          suite("CommonPassToPassTest", "passed", 8, 0),
          suite("SmPassToPassTest", "passed", 3, 0),
          suite("MdFailToPassTest", "failed", 2, 2),
        ]),
        device("tablet", [
          suite("CommonPassToPassTest", "passed", 8, 0),
          suite("LgFailToPassTest", "failed", 3, 3),
        ]),
      ]),
      answer: matrix([
        device("phone", [
          suite("CommonPassToPassTest", "passed", 8, 0),
          suite("SmPassToPassTest", "passed", 3, 0),
        ]),
        device("foldable", [
          suite("CommonPassToPassTest", "passed", 8, 0),
          suite("SmPassToPassTest", "passed", 3, 0),
          suite("MdFailToPassTest", "passed", 2, 0),
        ]),
        device("tablet", [
          suite("CommonPassToPassTest", "passed", 8, 0),
          suite("LgFailToPassTest", "passed", 3, 0),
        ]),
      ]),
    },
    artifacts: {
      result: ".ohostest-runs/run/result.json",
      summary: ".ohostest-runs/run/summary.md",
      commandLog: ".ohostest-runs/run/commands.log",
    },
    diagnostics: [],
  } satisfies CaseResult);

  assert.match(summary, /## Device Results/);
  assert.match(summary, /### phone\n\n#### pass_to_pass/);
  assert.match(summary, /#### fail_to_pass\n\n\| Suite \| SWE \| Answer \| Expected \| Verdict \|/);
  assert.match(summary, /\| none \| - \| - \| - \| - \|/);
  assert.match(summary, /### foldable\n\n#### pass_to_pass/);
  assert.match(
    summary,
    /\| MdFailToPassTest \| failed, 0\/2, failures=2 \| passed, 2\/2 \| SWE fail, Answer pass \| correct \|/,
  );
  assert.match(
    summary,
    /\| LgFailToPassTest \| failed, 0\/3, failures=3 \| passed, 3\/3 \| SWE fail, Answer pass \| correct \|/,
  );
  assert.match(summary, /\| swe \| 30 passed \/ 0 failed \| 0 passed \/ 5 failed \| correct \|/);
  assert.match(summary, /\| answer \| 30 passed \/ 0 failed \| 5 passed \/ 0 failed \| correct \|/);
});

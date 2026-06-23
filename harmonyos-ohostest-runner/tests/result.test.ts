import assert from "node:assert/strict";
import test from "node:test";
import { deriveMatrixStatus, renderSummaryMarkdown } from "../src/result.js";
import type { DeviceRunResult } from "../src/types.js";

function device(status: DeviceRunResult["status"], id: string = status): DeviceRunResult {
  return {
    id,
    target: `127.0.0.1:${status.length}500`,
    status,
    testsRun: status === "blocked" ? 0 : 25,
    failures: status === "failed" ? 1 : 0,
    errors: 0,
    passes: status === "blocked" ? 0 : status === "failed" ? 24 : 25,
    ignored: 0,
    suiteResults: [],
    durationMs: 1000,
    log: `devices/${id}.log`,
  };
}

test("deriveMatrixStatus returns completed when every selected device reaches a test result", () => {
  assert.equal(deriveMatrixStatus([device("passed", "phone"), device("failed", "tablet")]), "completed");
});

test("deriveMatrixStatus returns failed when any selected device is blocked", () => {
  assert.equal(deriveMatrixStatus([device("passed"), device("blocked")]), "failed");
});

test("deriveMatrixStatus returns failed when no device reaches a test result", () => {
  assert.equal(deriveMatrixStatus([device("blocked", "phone")]), "failed");
});

test("renderSummaryMarkdown includes a compact device table", () => {
  const markdown = renderSummaryMarkdown("completed", [device("passed", "phone")]);

  assert.match(markdown, /# ohosTest Matrix Summary/);
  assert.match(markdown, /\| phone \| passed \| 0 \| 25 \| 0 \| 0 \| 25 \| 0 \|/);
});

test("renderSummaryMarkdown includes per-suite details below device aggregation", () => {
  const item = device("failed", "foldable");
  item.suiteResults = [
    {
      suiteClass: "CommonPassToPassTest",
      status: "passed",
      testsRun: 10,
      failures: 0,
      errors: 0,
      passes: 10,
      ignored: 0,
      reportCode: 0,
      ok: true,
      testCases: [
        {
          name: "should_show_home",
          status: "passed",
          statusCode: 0,
        },
      ],
    },
    {
      suiteClass: "MdFailToPassTest",
      status: "failed",
      testsRun: 5,
      failures: 2,
      errors: 0,
      passes: 3,
      ignored: 0,
      reportCode: 1,
      ok: false,
      testCases: [
        {
          name: "should_show_md_columns",
          status: "failed",
          statusCode: -2,
        },
      ],
    },
  ];

  const markdown = renderSummaryMarkdown("completed", [item]);

  assert.match(markdown, /\| Device \| Status \| Suites \| Tests \| Failures \| Errors \| Passes \| Ignored \|/);
  assert.match(markdown, /\| foldable \| failed \| 2 \| 25 \| 1 \| 0 \| 24 \| 0 \|/);
  assert.match(markdown, /### foldable/);
  assert.match(markdown, /\| CommonPassToPassTest \| passed \| 10 \| 0 \| 0 \| 10 \| 0 \| 0 \|/);
  assert.match(markdown, /\| MdFailToPassTest \| failed \| 5 \| 2 \| 0 \| 3 \| 0 \| 1 \|/);
  assert.match(markdown, /\| Test Case \| Status \| Code \|/);
  assert.match(markdown, /\| should_show_home \| passed \| 0 \|/);
  assert.match(markdown, /\| should_show_md_columns \| failed \| -2 \|/);
});

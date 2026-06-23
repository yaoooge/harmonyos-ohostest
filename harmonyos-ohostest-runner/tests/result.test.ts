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
    durationMs: 1000,
    log: `devices/${id}.log`,
  };
}

test("deriveMatrixStatus returns passed when every device passes", () => {
  assert.equal(deriveMatrixStatus([device("passed", "phone"), device("passed", "tablet")]), "passed");
});

test("deriveMatrixStatus returns failed when any device reports test failure", () => {
  assert.equal(deriveMatrixStatus([device("passed"), device("failed")]), "failed");
});

test("deriveMatrixStatus returns partial when some devices pass and some are blocked", () => {
  assert.equal(deriveMatrixStatus([device("passed"), device("blocked")]), "partial");
});

test("deriveMatrixStatus returns blocked when no device reaches a test result", () => {
  assert.equal(deriveMatrixStatus([device("blocked", "phone")]), "blocked");
});

test("renderSummaryMarkdown includes a compact device table", () => {
  const markdown = renderSummaryMarkdown("passed", [device("passed", "phone")]);

  assert.match(markdown, /# ohosTest Matrix Summary/);
  assert.match(markdown, /\| phone \| 127\.0\.0\.1:6500 \| passed \| 25 \| 0 \| 0 \| 25 \| 0 \|/);
});

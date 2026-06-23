import assert from "node:assert/strict";
import test from "node:test";
import { buildAaTestCommand, parseAaTestOutput, shellQuote } from "../src/ohostest.js";

test("buildAaTestCommand emits full module command without class filter", () => {
  const command = buildAaTestCommand({
    hdc: "/fake/hdc",
    target: "127.0.0.1:15001",
    bundleName: "zhsc.1.xxxxxx",
    testModule: "entry_test",
    testRunner: "OpenHarmonyTestRunner",
    timeoutMs: 120000,
  });

  assert.equal(
    command,
    "/fake/hdc -t 127.0.0.1:15001 shell aa test -b zhsc.1.xxxxxx -m entry_test -s unittest OpenHarmonyTestRunner -w 120000",
  );
});

test("buildAaTestCommand includes class filter when configured", () => {
  const command = buildAaTestCommand({
    hdc: "/fake/hdc",
    target: "127.0.0.1:15002",
    bundleName: "zhsc.1.xxxxxx",
    testModule: "entry_test",
    testRunner: "OpenHarmonyTestRunner",
    timeoutMs: 120000,
    testClass: "HomePageAdaptiveTest",
  });

  assert.match(command, /-s class HomePageAdaptiveTest/);
});

test("parseAaTestOutput extracts summary and report code", () => {
  const parsed = parseAaTestOutput(
    [
      "OHOS_REPORT_RESULT: stream=Tests run: 25, Failure: 0, Error: 0, Pass: 25, Ignore: 0",
      "OHOS_REPORT_CODE: 0",
    ].join("\n"),
  );

  assert.deepEqual(parsed, {
    ok: true,
    testsRun: 25,
    failures: 0,
    errors: 0,
    passes: 25,
    ignored: 0,
    reportCode: 0,
  });
});

test("parseAaTestOutput marks missing summary as unparseable", () => {
  const parsed = parseAaTestOutput("runner exited without summary");

  assert.deepEqual(parsed, {
    ok: false,
    blockedReason: "test_output_unparseable",
  });
});

test("shellQuote uses Windows-compatible double quotes for paths with spaces", () => {
  assert.equal(
    shellQuote("D:\\Software\\Deveco Studio\\emulator\\deployed", "win32"),
    '"D:\\Software\\Deveco Studio\\emulator\\deployed"',
  );
  assert.equal(shellQuote("Mate 80 Pro", "win32"), '"Mate 80 Pro"');
});

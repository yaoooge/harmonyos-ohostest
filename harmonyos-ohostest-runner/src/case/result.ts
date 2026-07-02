import type { CaseMetadata, CaseResult, CaseStatus } from "./types/index.js";
import type {
  DeviceRunResult,
  MatrixResult,
  SuiteRunResult,
} from "../matrix/types/index.js";

export function deriveCaseStatus(
  runs: { swe?: MatrixResult; answer?: MatrixResult },
  diagnostics: string[],
): CaseStatus {
  if (diagnostics.length > 0) {
    return "failed";
  }
  if (!runs.swe || !runs.answer) {
    return "failed";
  }
  if (runs.swe.status !== "completed" || runs.answer.status !== "completed") {
    return "failed";
  }
  return "completed";
}

export function renderCaseSummary(result: CaseResult): string {
  return [
    "# ohosTest Case Summary",
    "",
    `Case: ${result.caseId}`,
    `Status: ${result.status}`,
    `Base Project: ${result.baseProject}`,
    `Command Log: ${result.artifacts.commandLog}`,
    "",
    "## Runs",
    "",
    "| Run | Status | Devices | Tests | Failures | Errors | Passes | Ignored |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    runRow("swe", result.runs.swe),
    runRow("answer", result.runs.answer),
    "",
    "## Device Results",
    "",
    ...deviceResultLines(result),
    "",
    "## Totals",
    "",
    "| Run | pass_to_pass | fail_to_pass | Verdict |",
    "| --- | ---: | ---: | --- |",
    totalsRow("swe", result.runs.swe),
    totalsRow("answer", result.runs.answer),
    "",
    "## Device Suites",
    "",
    ...deviceSuiteLines(result.metadata.deviceTestSuites),
    "",
    "## Pass To Pass",
    "",
    ...listOrEmpty(result.metadata.passToPass),
    "",
    "## Fail To Pass",
    "",
    ...listOrEmpty(result.metadata.failToPass),
    ...(result.diagnostics.length > 0
      ? ["", "## Diagnostics", "", ...listOrEmpty(result.diagnostics)]
      : []),
    "",
  ].join("\n");
}

export function metadataForResult(
  metadata: CaseMetadata,
): CaseResult["metadata"] {
  return {
    failToPass: metadata.failToPass,
    passToPass: metadata.passToPass,
    deviceTestSuites: metadata.deviceTestSuites ?? {},
    ...(metadata.enabledDevices
      ? { enabledDevices: metadata.enabledDevices }
      : {}),
  };
}

function runRow(label: string, run: MatrixResult | undefined): string {
  if (!run) {
    return `| ${label} | missing | 0 | 0 | 0 | 0 | 0 | 0 |`;
  }
  const totals = run.devices.reduce(
    (aggregate, device) => ({
      tests: aggregate.tests + device.testsRun,
      failures: aggregate.failures + device.failures,
      errors: aggregate.errors + device.errors,
      passes: aggregate.passes + device.passes,
      ignored: aggregate.ignored + device.ignored,
    }),
    { tests: 0, failures: 0, errors: 0, passes: 0, ignored: 0 },
  );
  return [
    "|",
    label,
    "|",
    run.status,
    "|",
    String(run.devices.length),
    "|",
    String(totals.tests),
    "|",
    String(totals.failures),
    "|",
    String(totals.errors),
    "|",
    String(totals.passes),
    "|",
    String(totals.ignored),
    "|",
  ].join(" ");
}

function deviceSuiteLines(
  deviceTestSuites: CaseResult["metadata"]["deviceTestSuites"],
): string[] {
  const lines = ["| Device | Suites |", "| --- | --- |"];
  for (const [deviceId, suites] of Object.entries(deviceTestSuites)) {
    lines.push(
      `| ${deviceId} | ${suites.map((suite) => suite.suite).join(", ")} |`,
    );
  }
  return lines;
}

function listOrEmpty(values: string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- none"];
}

function deviceResultLines(result: CaseResult): string[] {
  return Object.keys(result.metadata.deviceTestSuites).flatMap((deviceId) => [
    `### ${deviceId}`,
    "",
    "#### pass_to_pass",
    "",
    ...categoryTableLines(result, deviceId, "pass_to_pass"),
    "",
    "#### fail_to_pass",
    "",
    ...categoryTableLines(result, deviceId, "fail_to_pass"),
    "",
  ]);
}

function categoryTableLines(
  result: CaseResult,
  deviceId: string,
  category: "pass_to_pass" | "fail_to_pass",
): string[] {
  const suiteNames = (result.metadata.deviceTestSuites[deviceId] ?? [])
    .map((suite) => suite.suite)
    .filter((suiteClass) => suiteCategory(suiteClass) === category);
  const rows =
    suiteNames.length > 0
      ? suiteNames.map((suiteClass) =>
          categoryRow(result, deviceId, suiteClass, category),
        )
      : ["| none | - | - | - | - |"];
  return [
    "| Suite | SWE | Answer | Expected | Verdict |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ];
}

function categoryRow(
  result: CaseResult,
  deviceId: string,
  suiteClass: string,
  category: "pass_to_pass" | "fail_to_pass",
): string {
  const sweSuite = findSuite(result.runs.swe, deviceId, suiteClass);
  const answerSuite = findSuite(result.runs.answer, deviceId, suiteClass);
  const expected =
    category === "pass_to_pass"
      ? "SWE pass, Answer pass"
      : "SWE fail, Answer pass";
  const verdict = suiteVerdict(sweSuite, answerSuite, category);
  return [
    "|",
    suiteClass,
    "|",
    formatSuiteStatus(sweSuite),
    "|",
    formatSuiteStatus(answerSuite),
    "|",
    expected,
    "|",
    verdict,
    "|",
  ].join(" ");
}

function findSuite(
  run: MatrixResult | undefined,
  deviceId: string,
  suiteClass: string,
): SuiteRunResult | undefined {
  return findDevice(run, deviceId)?.suiteResults.find(
    (suite) => suite.suiteClass === suiteClass,
  );
}

function findDevice(
  run: MatrixResult | undefined,
  deviceId: string,
): DeviceRunResult | undefined {
  return run?.devices.find((device) => device.id === deviceId);
}

function formatSuiteStatus(suite: SuiteRunResult | undefined): string {
  if (!suite) {
    return "missing";
  }
  const passed = Math.max(0, suite.testsRun - suite.failures - suite.errors);
  const base = `${suite.status}, ${passed}/${suite.testsRun}`;
  const details = [
    suite.failures > 0 ? `failures=${suite.failures}` : undefined,
    suite.errors > 0 ? `errors=${suite.errors}` : undefined,
  ].filter((value): value is string => Boolean(value));
  return details.length > 0 ? `${base}, ${details.join(", ")}` : base;
}

function suiteVerdict(
  sweSuite: SuiteRunResult | undefined,
  answerSuite: SuiteRunResult | undefined,
  category: "pass_to_pass" | "fail_to_pass",
): string {
  if (!sweSuite || !answerSuite) {
    return "incorrect";
  }
  const swePassed = sweSuite.status === "passed";
  const answerPassed = answerSuite.status === "passed";
  if (category === "pass_to_pass") {
    return swePassed && answerPassed ? "correct" : "incorrect";
  }
  return !swePassed && answerPassed ? "correct" : "incorrect";
}

function totalsRow(
  label: "swe" | "answer",
  run: MatrixResult | undefined,
): string {
  const totals = categoryTotals(run);
  const verdict =
    label === "swe"
      ? totals.passToPassFailed === 0 && totals.failToPassFailed > 0
      : totals.passToPassFailed === 0 && totals.failToPassFailed === 0;
  return [
    "|",
    label,
    "|",
    `${totals.passToPassPassed} passed / ${totals.passToPassFailed} failed`,
    "|",
    `${totals.failToPassPassed} passed / ${totals.failToPassFailed} failed`,
    "|",
    verdict ? "correct" : "incorrect",
    "|",
  ].join(" ");
}

function categoryTotals(run: MatrixResult | undefined): {
  passToPassPassed: number;
  passToPassFailed: number;
  failToPassPassed: number;
  failToPassFailed: number;
} {
  const totals = {
    passToPassPassed: 0,
    passToPassFailed: 0,
    failToPassPassed: 0,
    failToPassFailed: 0,
  };
  for (const device of run?.devices ?? []) {
    for (const suite of device.suiteResults) {
      const passed = Math.max(
        0,
        suite.testsRun - suite.failures - suite.errors,
      );
      const failed = suite.failures + suite.errors;
      if (suiteCategory(suite.suiteClass) === "fail_to_pass") {
        totals.failToPassPassed += passed;
        totals.failToPassFailed += failed;
      } else {
        totals.passToPassPassed += passed;
        totals.passToPassFailed += failed;
      }
    }
  }
  return totals;
}

function suiteCategory(suiteClass: string): "pass_to_pass" | "fail_to_pass" {
  return suiteClass.includes("FailToPass") ? "fail_to_pass" : "pass_to_pass";
}

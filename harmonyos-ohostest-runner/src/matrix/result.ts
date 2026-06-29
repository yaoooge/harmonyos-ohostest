import type { DeviceRunResult, MatrixStatus } from "./types/index.js";

export function deriveMatrixStatus(devices: DeviceRunResult[]): MatrixStatus {
  if (devices.length === 0) {
    return "failed";
  }
  if (devices.some((device) => device.status === "blocked")) {
    return "failed";
  }
  return "completed";
}

export function renderSummaryMarkdown(status: MatrixStatus, devices: DeviceRunResult[]): string {
  const rows = devices.map((device) =>
    [
      "|",
      device.id,
      "|",
      device.status,
      "|",
      String(device.suiteResults.length),
      "|",
      String(device.testsRun),
      "|",
      String(device.failures),
      "|",
      String(device.errors),
      "|",
      String(device.passes),
      "|",
      String(device.ignored),
      "|",
    ].join(" "),
  );

  const suiteSections = devices.flatMap((device) => {
    if (device.suiteResults.length === 0) {
      return [];
    }
    const suiteRows = device.suiteResults.map((suite) =>
      [
        "|",
        suite.suiteClass,
        "|",
        suite.status,
        "|",
        String(suite.testsRun),
        "|",
        String(suite.failures),
        "|",
        String(suite.errors),
        "|",
        String(suite.passes),
        "|",
        String(suite.ignored),
        "|",
        String(suite.reportCode ?? ""),
        "|",
      ].join(" "),
    );
    const caseSections = device.suiteResults.flatMap((suite) => {
      if (suite.testCases.length === 0) {
        return [];
      }
      const caseRows = suite.testCases.map((testCase) =>
        [
          "|",
          testCase.name,
          "|",
          testCase.status,
          "|",
          String(testCase.statusCode),
          "|",
        ].join(" "),
      );
      return [
        `#### ${suite.suiteClass}`,
        "",
        "| Test Case | Status | Code |",
        "| --- | --- | ---: |",
        ...caseRows,
        "",
      ];
    });
    return [
      `### ${device.id}`,
      "",
      ...(device.foldServerPort !== undefined
        ? [`- Fold Server Port: ${device.foldServerPort}`, ""]
        : []),
      "| Suite | Status | Tests | Failures | Errors | Passes | Ignored | Report |",
      "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...suiteRows,
      "",
      ...caseSections,
    ];
  });

  return [
    "# ohosTest Matrix Summary",
    "",
    `Status: ${status}`,
    "",
    "| Device | Status | Suites | Tests | Failures | Errors | Passes | Ignored |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
    ...suiteSections,
  ].join("\n");
}

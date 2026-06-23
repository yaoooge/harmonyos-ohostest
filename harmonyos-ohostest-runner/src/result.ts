import type { DeviceRunResult, MatrixStatus } from "./types.js";

export function deriveMatrixStatus(devices: DeviceRunResult[]): MatrixStatus {
  if (devices.length === 0) {
    return "blocked";
  }
  if (devices.some((device) => device.status === "failed")) {
    return "failed";
  }
  if (devices.every((device) => device.status === "passed")) {
    return "passed";
  }
  if (devices.some((device) => device.status === "passed")) {
    return "partial";
  }
  return "blocked";
}

export function renderSummaryMarkdown(status: MatrixStatus, devices: DeviceRunResult[]): string {
  const rows = devices.map((device) =>
    [
      "|",
      device.id,
      "|",
      device.target,
      "|",
      device.status,
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

  return [
    "# ohosTest Matrix Summary",
    "",
    `Status: ${status}`,
    "",
    "| Device | Target | Status | Tests | Failure | Error | Pass | Ignore |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
  ].join("\n");
}

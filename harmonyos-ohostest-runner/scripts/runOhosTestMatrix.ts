import { parseOhosTestMatrixArgs, runOhosTestMatrix } from "../src/index.js";
import type { DeviceRunResult, MatrixResult } from "../src/types.js";

async function main(): Promise<void> {
  const input = parseOhosTestMatrixArgs(process.argv.slice(2));
  const result = await runOhosTestMatrix(input);

  if (result.status === "completed") {
    console.log(JSON.stringify({ status: result.status, out: input.out }, null, 2));
    return;
  }

  printFailureSummary(result, input.out);
  process.exitCode = 1;
}

function printFailureSummary(result: MatrixResult, out: string | undefined): void {
  const lines: string[] = [];

  if (result.build.status === "blocked") {
    lines.push(`✗ 构建失败：${result.build.blockedReason ?? "unknown"}`, "");
    for (const diagnostic of result.diagnostics) {
      lines.push(`  - ${diagnostic}`);
    }
    lines.push("", `  详细命令日志：${result.artifacts.commandLog}`, "");
  } else {
    lines.push("✗ 设备阶段失败：", "");
    for (const device of result.devices) {
      lines.push(...renderDeviceFailure(device));
    }
  }

  lines.push(`  完整结果：${out ?? "(未指定 out)"}`);

  console.error(lines.join("\n"));
}

function renderDeviceFailure(device: DeviceRunResult): string[] {
  const head = device.profile ? `${device.id} (${device.profile})` : device.id;
  const reason = device.blockedReason ? ` → ${device.blockedReason}` : "";
  const lines: string[] = [`  ✗ ${head}: ${device.status}${reason}`];

  const failedSuites = device.suiteResults.filter(
    (suite) => suite.status !== "passed",
  );
  for (const suite of failedSuites) {
    const failedCases = suite.testCases.filter(
      (testCase) => testCase.status !== "passed" && testCase.status !== "ignored",
    );
    if (failedCases.length > 0) {
      lines.push(`     ✗ ${suite.suiteClass}: ${failedCases.length} 个用例失败`);
      for (const testCase of failedCases) {
        lines.push(`        - ${testCase.name} [${testCase.status}]`);
      }
    } else {
      lines.push(
        `     ✗ ${suite.suiteClass}: ${suite.failures} 失败 / ${suite.errors} 错误`,
      );
    }
  }

  lines.push(`     设备日志：${device.log}`);
  return lines;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

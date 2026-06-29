import type { ParsedAaTestOutput, TestCaseRunResult } from "./types/index.js";
import { shellQuote } from "../shared/utils/shellQuote.js";

export interface BuildAaTestCommandInput {
  hdc: string;
  target: string;
  bundleName: string;
  testModule: string;
  testRunner: string;
  timeoutMs: number;
  testClass?: string;
}

export function buildAaTestCommand(input: BuildAaTestCommandInput): string {
  return [
    shellQuote(input.hdc),
    "-t",
    shellQuote(input.target),
    "shell aa test",
    "-b",
    shellQuote(input.bundleName),
    "-m",
    shellQuote(input.testModule),
    "-s unittest",
    shellQuote(input.testRunner),
    ...(input.testClass ? ["-s class", shellQuote(input.testClass)] : []),
    "-w",
    String(input.timeoutMs),
  ].join(" ");
}

export function parseAaTestOutput(output: string): ParsedAaTestOutput {
  const summary =
    /Tests run:\s*(\d+),\s*Failure:\s*(\d+),\s*Error:\s*(\d+),\s*Pass:\s*(\d+),\s*Ignore:\s*(\d+)/.exec(
      output,
    );
  if (!summary) {
    return {
      ok: false,
      blockedReason: "test_output_unparseable",
    };
  }

  const reportCodeMatch = /OHOS_REPORT_CODE:\s*(-?\d+)/.exec(output);
  const testsRun = Number(summary[1]);
  const failures = Number(summary[2]);
  const errors = Number(summary[3]);
  const passes = Number(summary[4]);
  const ignored = Number(summary[5]);
  const reportCode = reportCodeMatch ? Number(reportCodeMatch[1]) : undefined;

  return {
    ok: failures === 0 && errors === 0 && (reportCode ?? 0) === 0,
    testsRun,
    failures,
    errors,
    passes,
    ignored,
    testCases: parseTestCases(output),
    ...(reportCode !== undefined ? { reportCode } : {}),
  };
}

function parseTestCases(output: string): TestCaseRunResult[] {
  const cases = new Map<string, TestCaseRunResult>();
  let currentTest: string | undefined;
  for (const line of output.split(/\r?\n/)) {
    const testMatch = /^OHOS_REPORT_STATUS:\s+test=(.+)$/.exec(line);
    if (testMatch) {
      currentTest = testMatch[1];
      continue;
    }
    const codeMatch = /^OHOS_REPORT_STATUS_CODE:\s*(-?\d+)$/.exec(line);
    if (codeMatch && currentTest) {
      const statusCode = Number(codeMatch[1]);
      cases.set(currentTest, {
        name: currentTest,
        status: statusFromStatusCode(statusCode),
        statusCode,
      });
      currentTest = undefined;
    }
  }
  return [...cases.values()];
}

function statusFromStatusCode(statusCode: number): TestCaseRunResult["status"] {
  if (statusCode === 0) {
    return "passed";
  }
  if (statusCode === -3) {
    return "ignored";
  }
  if (statusCode === 1) {
    return "running";
  }
  return "failed";
}

export { shellQuote };

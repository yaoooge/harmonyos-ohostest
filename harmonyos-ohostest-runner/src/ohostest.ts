import type { ParsedAaTestOutput } from "./types.js";

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
    ...(reportCode !== undefined ? { reportCode } : {}),
  };
}

export function shellQuote(value: string, platform: NodeJS.Platform = process.platform): string {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(value)) {
    return value;
  }
  if (platform === "win32") {
    return quoteWindowsArg(value);
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function quoteWindowsArg(value: string): string {
  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`;
}

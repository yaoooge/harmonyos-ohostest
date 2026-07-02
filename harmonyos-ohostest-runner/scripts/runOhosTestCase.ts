import { parseOhosTestCaseArgs, runOhosTestCase } from "../src/index.js";

async function main(): Promise<void> {
  const input = parseOhosTestCaseArgs(process.argv.slice(2));
  const result = await runOhosTestCase(input);

  console.log(
    JSON.stringify(
      {
        status: result.status,
        out: pathFromCaseDir(result.caseDir, result.artifacts.result),
        summary: pathFromCaseDir(result.caseDir, result.artifacts.summary),
      },
      null,
      2,
    ),
  );

  if (result.status !== "completed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function pathFromCaseDir(caseDir: string, value: string): string {
  return new URL(value, `file://${caseDir.replace(/\/?$/, "/")}`).pathname;
}

import { parseOhosTestMatrixArgs, runOhosTestMatrix } from "../src/index.js";

async function main(): Promise<void> {
  const input = parseOhosTestMatrixArgs(process.argv.slice(2));
  const result = await runOhosTestMatrix(input);
  console.log(JSON.stringify({ status: result.status, out: input.out }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

import assert from "node:assert/strict";
import test from "node:test";
import { runDetachedCommand } from "../src/command.js";
import { shellQuote } from "../src/ohostest.js";

test("runDetachedCommand reports quick command failures instead of unconditional success", async () => {
  const command = `${shellQuote(process.execPath)} -e ${shellQuote("process.exit(7)")}`;

  const result = await runDetachedCommand(command, process.cwd(), 1000);

  assert.equal(result.exitCode, 7);
});

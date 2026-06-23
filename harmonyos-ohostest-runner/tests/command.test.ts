import assert from "node:assert/strict";
import test from "node:test";
import { decodeCommandOutput, runDetachedCommand } from "../src/command.js";
import { shellQuote } from "../src/ohostest.js";

test("runDetachedCommand reports quick command failures instead of unconditional success", async () => {
  const command = `${shellQuote(process.execPath)} -e ${shellQuote("process.exit(7)")}`;

  const result = await runDetachedCommand(command, process.cwd(), 1000);

  assert.equal(result.exitCode, 7);
});

test("decodeCommandOutput decodes Windows GB18030 command output", () => {
  const output = decodeCommandOutput(Buffer.from([0xc4, 0xe3, 0xba, 0xc3]), "win32");

  assert.equal(output, "\u4f60\u597d");
});

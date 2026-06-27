import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { foldTriggerTemplate } from "../src/fold-template.js";
import { deployFoldTrigger, healthCheck } from "../src/fold.js";

describe("foldTriggerTemplate", () => {
  it("embeds devicePort in the generated template", () => {
    const template = foldTriggerTemplate(8765);
    assert.ok(template.includes("const FOLD_SERVER_PORT = 8765"));
  });

  it("includes triggerFold export", () => {
    const template = foldTriggerTemplate(8765);
    assert.ok(template.includes("export async function triggerFold"));
  });

  it("includes triggerRotation export", () => {
    const template = foldTriggerTemplate(8765);
    assert.ok(template.includes("export async function triggerRotation"));
  });

  it("includes triggerLandscapeHover export", () => {
    const template = foldTriggerTemplate(8765);
    assert.ok(template.includes("export async function triggerLandscapeHover"));
  });

  it("includes sleep export", () => {
    const template = foldTriggerTemplate(8765);
    assert.ok(template.includes("export function sleep"));
  });

  it("contains no placeholder after injection", () => {
    const template = foldTriggerTemplate(8765);
    assert.ok(!template.includes("__FOLD_PORT__"));
  });

  it("different ports produce different templates", () => {
    const t1 = foldTriggerTemplate(8765);
    const t2 = foldTriggerTemplate(8766);
    assert.notStrictEqual(t1, t2);
  });
});

describe("deployFoldTrigger", () => {
  it("creates FoldTrigger.ets in a temp project directory", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "fold-test-"));
    try {
      const entryDir = path.join(tmp, "entry", "src", "ohosTest", "ets", "util");
      const deployed = await deployFoldTrigger(tmp, 8765, "entry");
      const expected = path.join(entryDir, "FoldTrigger.ets");
      assert.strictEqual(deployed, expected);
      const content = await fs.readFile(expected, "utf-8");
      assert.ok(content.includes("const FOLD_SERVER_PORT = 8765"));
      assert.ok(content.includes("export async function triggerFold"));
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("overwrites when FoldTrigger.ets already exists", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "fold-test-"));
    try {
      const entryDir = path.join(tmp, "entry", "src", "ohosTest", "ets", "util");
      await fs.mkdir(entryDir, { recursive: true });
      const existing = path.join(entryDir, "FoldTrigger.ets");
      await fs.writeFile(existing, "// old content", "utf-8");

      const deployed = await deployFoldTrigger(tmp, 9999, "entry");
      assert.strictEqual(deployed, existing);
      const content = await fs.readFile(existing, "utf-8");
      assert.ok(content.includes("const FOLD_SERVER_PORT = 9999"));
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe("healthCheck", () => {
  it("returns false when no server is running on the port", async () => {
    const result = await healthCheck(65432, 1000);
    assert.strictEqual(result, false);
  });
});

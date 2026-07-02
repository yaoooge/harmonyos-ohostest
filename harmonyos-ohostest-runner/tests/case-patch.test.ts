import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { applyPatch } from "../src/case/patch.js";

test("applyPatch applies relative to project even when project is inside a parent git repository", async (t) => {
  const root = path.join(process.cwd(), ".tmp-case-patch-test");
  const project = path.join(root, "project");
  const patchFile = path.join(root, "add-file.patch");
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(project, { recursive: true });
  await fs.writeFile(path.join(project, "existing.txt"), "base\n", "utf-8");
  await fs.writeFile(
    patchFile,
    [
      "diff --git a/generated.txt b/generated.txt",
      "new file mode 100644",
      "index 0000000..1269488",
      "--- /dev/null",
      "+++ b/generated.txt",
      "@@ -0,0 +1 @@",
      "+generated",
      "",
    ].join("\n"),
    "utf-8",
  );

  await applyPatch({ project, patchFile, label: "test_patch" });

  assert.equal(await fs.readFile(path.join(project, "generated.txt"), "utf-8"), "generated\n");
  await assert.rejects(fs.stat(path.join(process.cwd(), "generated.txt")));
});

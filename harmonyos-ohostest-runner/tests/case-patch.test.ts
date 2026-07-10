import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  applyPatch,
  buildGitApplyCommand,
  copyBaseProject,
} from "../src/case/patch.js";

test("copyBaseProject copies symlink targets as real files and directories", async (t) => {
  const root = path.join(process.cwd(), ".tmp-copy-base-project-test");
  const baseProject = path.join(root, "base");
  const workProject = path.join(root, "work", "project");
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(path.join(baseProject, "actual-dir"), { recursive: true });
  await fs.writeFile(
    path.join(baseProject, "actual-file.txt"),
    "file target\n",
    "utf-8",
  );
  await fs.writeFile(
    path.join(baseProject, "actual-dir", "nested.txt"),
    "directory target\n",
    "utf-8",
  );
  await fs.symlink("actual-file.txt", path.join(baseProject, "file-link.txt"));
  await fs.symlink("actual-dir", path.join(baseProject, "dir-link"), "dir");

  await copyBaseProject({ baseProject, workProject });

  const copiedFileLink = await fs.lstat(path.join(workProject, "file-link.txt"));
  const copiedDirLink = await fs.lstat(path.join(workProject, "dir-link"));
  assert.equal(copiedFileLink.isSymbolicLink(), false);
  assert.equal(copiedFileLink.isFile(), true);
  assert.equal(copiedDirLink.isSymbolicLink(), false);
  assert.equal(copiedDirLink.isDirectory(), true);
  assert.equal(
    await fs.readFile(path.join(workProject, "file-link.txt"), "utf-8"),
    "file target\n",
  );
  assert.equal(
    await fs.readFile(path.join(workProject, "dir-link", "nested.txt"), "utf-8"),
    "directory target\n",
  );
});

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

  assert.equal(
    await fs.readFile(path.join(project, "generated.txt"), "utf-8"),
    "generated\n",
  );
  await assert.rejects(fs.stat(path.join(process.cwd(), "generated.txt")));
});

test("buildGitApplyCommand uses cmd-compatible environment syntax on Windows", () => {
  const command = buildGitApplyCommand({
    project: "C:\\work\\case\\project",
    patchFile: "C:\\work\\case\\golden patch.patch",
    check: true,
    platform: "win32",
  });

  assert.equal(
    command,
    'set "GIT_CEILING_DIRECTORIES=C:\\work\\case" && git apply --ignore-whitespace --check "C:\\work\\case\\golden patch.patch"',
  );
});

test("buildGitApplyCommand keeps inline environment syntax on POSIX shells", () => {
  const command = buildGitApplyCommand({
    project: "/tmp/case/project",
    patchFile: "/tmp/case/golden patch.patch",
    check: false,
    platform: "darwin",
  });

  assert.equal(
    command,
    "GIT_CEILING_DIRECTORIES=/tmp/case git apply --ignore-whitespace '/tmp/case/golden patch.patch'",
  );
});

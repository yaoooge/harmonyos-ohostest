import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { withSweTabletCompatibility } from "../src/case/deviceCompatibility.js";
import { parseJson5ish } from "../src/matrix/utils/json5ish.js";

async function makeTempProject(
  t: test.TestContext,
  deviceTypes: unknown = ["phone"],
): Promise<{ project: string; modulePath: string; original: string }> {
  const project = await fs.mkdtemp(
    path.join(os.tmpdir(), "ohostest-swe-tablet-"),
  );
  t.after(async () => {
    await fs.rm(project, { recursive: true, force: true });
  });
  await fs.writeFile(
    path.join(project, "build-profile.json5"),
    JSON.stringify({
      modules: [
        { name: "library", srcPath: "./commons/library" },
        { name: "entry", srcPath: "./products/entry" },
      ],
    }),
    "utf-8",
  );
  const modulePath = path.join(
    project,
    "products",
    "entry",
    "src",
    "main",
    "module.json5",
  );
  await fs.mkdir(path.dirname(modulePath), { recursive: true });
  const original = `{
    // Preserve this comment after the temporary compatibility adjustment.
    "module": {
      "name": "entry",
      "deviceTypes": ${JSON.stringify(deviceTypes)}
    }
  }\n`;
  await fs.writeFile(modulePath, original, "utf-8");
  return { project, modulePath, original };
}

test("withSweTabletCompatibility temporarily adds tablet and restores the original file", async (t) => {
  const { project, modulePath, original } = await makeTempProject(t);

  const result = await withSweTabletCompatibility({
    project,
    enabled: true,
    run: async () => {
      const config = parseJson5ish(await fs.readFile(modulePath, "utf-8")) as {
        module: { deviceTypes: string[] };
      };
      assert.deepEqual(config.module.deviceTypes, ["phone", "tablet"]);
      return "completed";
    },
  });

  assert.equal(result, "completed");
  assert.equal(await fs.readFile(modulePath, "utf-8"), original);
});

test("withSweTabletCompatibility leaves an existing tablet declaration byte-for-byte unchanged", async (t) => {
  const { project, modulePath, original } = await makeTempProject(t, [
    "phone",
    "tablet",
  ]);

  const result = await withSweTabletCompatibility({
    project,
    enabled: true,
    run: async () => "completed",
  });

  assert.equal(result, "completed");
  assert.equal(await fs.readFile(modulePath, "utf-8"), original);
});

test("withSweTabletCompatibility skips project inspection when disabled", async () => {
  const result = await withSweTabletCompatibility({
    project: "/missing/project",
    enabled: false,
    run: async () => "skipped",
  });

  assert.equal(result, "skipped");
});

test("withSweTabletCompatibility restores the original file and rethrows callback errors", async (t) => {
  const { project, modulePath, original } = await makeTempProject(t);
  const expectedError = new Error("run failed");

  await assert.rejects(
    withSweTabletCompatibility({
      project,
      enabled: true,
      run: async () => {
        throw expectedError;
      },
    }),
    (error) => error === expectedError,
  );
  assert.equal(await fs.readFile(modulePath, "utf-8"), original);
});

test("withSweTabletCompatibility rejects invalid deviceTypes with a stable error", async (t) => {
  const { project } = await makeTempProject(t, ["phone", 1]);

  await assert.rejects(
    withSweTabletCompatibility({
      project,
      enabled: true,
      run: async () => undefined,
    }),
    /swe_tablet_compatibility_invalid_module/,
  );
});

test("withSweTabletCompatibility rejects an invalid module list with a stable error", async (t) => {
  const { project } = await makeTempProject(t);
  await fs.writeFile(
    path.join(project, "build-profile.json5"),
    JSON.stringify({ modules: {} }),
    "utf-8",
  );

  await assert.rejects(
    withSweTabletCompatibility({
      project,
      enabled: true,
      run: async () => undefined,
    }),
    /swe_tablet_compatibility_entry_module_not_found/,
  );
});

test("withSweTabletCompatibility reports restore and callback failures together", async (t) => {
  const { project, modulePath } = await makeTempProject(t);

  await assert.rejects(
    withSweTabletCompatibility({
      project,
      enabled: true,
      run: async () => {
        await fs.rm(path.dirname(modulePath), { recursive: true, force: true });
        throw new Error("run failed");
      },
    }),
    /swe_tablet_compatibility_restore_failed:.*run failed/s,
  );
});

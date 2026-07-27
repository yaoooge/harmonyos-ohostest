import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { discoverProjectInfo } from "../src/matrix/utils/projectDiscovery.js";

interface ModuleFixture {
  name: string;
  srcPath: string;
  type: string;
  applyToProducts?: string[];
  packageName?: string;
  dependencies?: Record<string, string>;
}

async function makeProject(
  t: test.TestContext,
  modules: ModuleFixture[],
): Promise<string> {
  const project = await fs.mkdtemp(
    path.join(os.tmpdir(), "ohostest-project-discovery-"),
  );
  t.after(async () => {
    await fs.rm(project, { recursive: true, force: true });
  });

  await fs.mkdir(path.join(project, "AppScope"), { recursive: true });
  await fs.writeFile(
    path.join(project, "AppScope", "app.json5"),
    JSON.stringify({ app: { bundleName: "example.bundle" } }),
    "utf-8",
  );
  await fs.writeFile(
    path.join(project, "build-profile.json5"),
    JSON.stringify({
      app: { products: [{ name: "default" }] },
      modules: modules.map((module) => ({
        name: module.name,
        srcPath: `./${module.srcPath}`,
        ...(module.applyToProducts
          ? {
              targets: [
                {
                  name: "default",
                  applyToProducts: module.applyToProducts,
                },
              ],
            }
          : {}),
      })),
    }),
    "utf-8",
  );

  for (const module of modules) {
    await fs.mkdir(path.join(project, module.srcPath, "src", "main"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(project, module.srcPath, "src", "main", "module.json5"),
      JSON.stringify({
        module: { name: module.name, type: module.type },
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(project, module.srcPath, "oh-package.json5"),
      JSON.stringify({
        name: module.packageName ?? module.name,
        dependencies: module.dependencies ?? {},
      }),
      "utf-8",
    );
  }

  const entry = modules.find((module) => module.name === "entry");
  assert.ok(entry);
  await fs.mkdir(path.join(project, entry.srcPath, "src", "ohosTest"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(project, entry.srcPath, "src", "ohosTest", "module.json5"),
    JSON.stringify({ module: { name: "entry_test" } }),
    "utf-8",
  );
  return project;
}

test("discoverProjectInfo finds shared modules in build-profile order", async (t) => {
  const project = await makeProject(t, [
    {
      name: "entry",
      srcPath: "products/entry",
      type: "entry",
    },
    {
      name: "common",
      srcPath: "commons/common",
      type: "shared",
    },
    {
      name: "styles",
      srcPath: "commons/styles",
      type: "shared",
    },
  ]);

  const info = await discoverProjectInfo(project);

  assert.deepEqual(info.sharedModules, [
    {
      name: "common",
      srcPath: "commons/common",
      packageName: "common",
      dependencies: [],
      outputDir: path.join(
        project,
        "commons/common/build/default/outputs/default",
      ),
    },
    {
      name: "styles",
      srcPath: "commons/styles",
      packageName: "styles",
      dependencies: [],
      outputDir: path.join(
        project,
        "commons/styles/build/default/outputs/default",
      ),
    },
  ]);
});

test("discoverProjectInfo excludes non-shared and other-product modules", async (t) => {
  const project = await makeProject(t, [
    {
      name: "entry",
      srcPath: "products/entry",
      type: "entry",
    },
    {
      name: "feature",
      srcPath: "features/feature",
      type: "feature",
    },
    {
      name: "tablet_common",
      srcPath: "commons/tablet_common",
      type: "shared",
      applyToProducts: ["tablet"],
    },
  ]);

  const info = await discoverProjectInfo(project);

  assert.deepEqual(info.sharedModules, []);
});

test("discoverProjectInfo reports the module when module.json5 is missing", async (t) => {
  const project = await makeProject(t, [
    {
      name: "entry",
      srcPath: "products/entry",
      type: "entry",
    },
    {
      name: "common",
      srcPath: "commons/common",
      type: "shared",
    },
  ]);
  await fs.rm(
    path.join(project, "commons/common/src/main/module.json5"),
  );

  await assert.rejects(
    discoverProjectInfo(project),
    /module common.*module\.json5/i,
  );
});

test("discoverProjectInfo orders shared modules after their shared dependencies", async (t) => {
  const project = await makeProject(t, [
    {
      name: "entry",
      srcPath: "products/entry",
      type: "entry",
    },
    {
      name: "common",
      srcPath: "commons/common",
      type: "shared",
      packageName: "@example/common",
      dependencies: { "@example/utils": "1.0.0" },
    },
    {
      name: "utils",
      srcPath: "commons/utils",
      type: "shared",
      packageName: "@example/utils",
    },
  ]);

  const info = await discoverProjectInfo(project);

  assert.deepEqual(
    info.sharedModules.map((moduleInfo) => moduleInfo.name),
    ["utils", "common"],
  );
});

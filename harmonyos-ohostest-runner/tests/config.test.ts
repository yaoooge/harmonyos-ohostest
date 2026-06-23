import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadMatrixConfig } from "../src/config.js";

async function makeTempProject(t: test.TestContext): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ohostest-config-"));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.writeFile(path.join(root, "hvigorw"), "#!/bin/sh\n", "utf-8");
  await fs.mkdir(path.join(root, "AppScope"), { recursive: true });
  await fs.writeFile(
    path.join(root, "AppScope", "app.json5"),
    `{
      "app": {
        // json5 comments are common in HarmonyOS config files
        "bundleName": "zhsc.1.xxxxxx"
      }
    }\n`,
    "utf-8",
  );
  await fs.writeFile(
    path.join(root, "build-profile.json5"),
    JSON.stringify({
      app: { products: [{ name: "default" }] },
      modules: [{ name: "entry", srcPath: "./products/entry" }],
    }),
    "utf-8",
  );
  await fs.mkdir(path.join(root, "products", "entry", "src", "ohosTest"), { recursive: true });
  await fs.writeFile(
    path.join(root, "products", "entry", "src", "ohosTest", "module.json5"),
    JSON.stringify({ module: { name: "entry_test" } }),
    "utf-8",
  );
  return root;
}

async function writeMachineConfig(project: string): Promise<string> {
  const machineConfigPath = path.join(project, "machine.json");
  await fs.writeFile(
    machineConfigPath,
    JSON.stringify({
      paths: { hdc: "/fake/hdc", hvigorw: "/fake/hvigorw" },
      devices: [{ id: "phone", target: "127.0.0.1:15001", profile: "Mate 80 Pro", hdcPort: 15001 }],
    }),
    "utf-8",
  );
  return machineConfigPath;
}

test("loadMatrixConfig infers project information and reads machine devices", async (t) => {
  const project = await makeTempProject(t);
  const machineConfigPath = await writeMachineConfig(project);

  const config = await loadMatrixConfig({ project, machineConfigPath });

  assert.equal(config.product, "default");
  assert.equal(config.module, "entry");
  assert.equal(config.bundleName, "zhsc.1.xxxxxx");
  assert.equal(config.testModule, "entry_test");
  assert.equal(config.testRunner, "OpenHarmonyTestRunner");
  assert.equal(config.paths.hvigorw, "/fake/hvigorw");
  assert.equal(config.timeoutMs, 120000);
  assert.equal(config.build.appTask, "assembleApp");
  assert.equal(config.build.testTask, "ohosTest@PackageHap");
  assert.equal(
    config.artifacts.appHap,
    path.join(project, "products/entry/build/default/outputs/default/entry-default-unsigned.hap"),
  );
  assert.equal(
    config.artifacts.testHap,
    path.join(project, "products/entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap"),
  );
  assert.equal(config.devices[0]?.hdcPort, 15001);
  assert.equal(config.devices[0]?.startEmulator, false);
});

test("loadMatrixConfig rejects missing hvigorw, empty devices, and invalid target from machine config", async (t) => {
  const project = await makeTempProject(t);
  const machineConfigPath = path.join(project, "bad.json");

  await fs.writeFile(
    machineConfigPath,
    JSON.stringify({ paths: { hdc: "/fake/hdc" }, devices: [{ id: "phone", target: "127.0.0.1:15001" }] }),
    "utf-8",
  );
  await assert.rejects(() => loadMatrixConfig({ project, machineConfigPath }), /paths\.hvigorw/);

  await fs.writeFile(machineConfigPath, JSON.stringify({ paths: { hvigorw: "/fake/hvigorw" }, devices: [] }), "utf-8");
  await assert.rejects(() => loadMatrixConfig({ project, machineConfigPath }), /devices/);

  await fs.writeFile(machineConfigPath, JSON.stringify({ devices: [] }), "utf-8");
  await fs.writeFile(machineConfigPath, JSON.stringify({ paths: { hvigorw: "/fake/hvigorw" }, devices: [{ id: "phone", target: "not a target" }] }), "utf-8");
  await assert.rejects(() => loadMatrixConfig({ project, machineConfigPath }), /target/);
});

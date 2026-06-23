import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runOhosTestMatrix } from "../src/runner.js";

async function makeProject(t: test.TestContext): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ohostest-runner-"));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.writeFile(path.join(root, "hvigorw"), "#!/bin/sh\n", "utf-8");
  await fs.mkdir(path.join(root, "AppScope"), { recursive: true });
  await fs.writeFile(
    path.join(root, "AppScope", "app.json5"),
    JSON.stringify({ app: { bundleName: "zhsc.1.xxxxxx" } }),
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
  await fs.mkdir(path.join(root, "entry/build/default/outputs/default"), { recursive: true });
  await fs.mkdir(path.join(root, "entry/build/default/outputs/ohosTest"), { recursive: true });
  await fs.writeFile(
    path.join(root, "entry/build/default/outputs/default/entry-default-unsigned.hap"),
    "",
    "utf-8",
  );
  await fs.writeFile(
    path.join(root, "entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap"),
    "",
    "utf-8",
  );
  return root;
}

async function makeMachineConfig(project: string): Promise<string> {
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

test("runOhosTestMatrix builds, installs, runs tests, and writes artifacts", async (t) => {
  const project = await makeProject(t);
  const machineConfigPath = await makeMachineConfig(project);
  const out = path.join(project, ".ohostest-runs/latest/result.json");
  await fs.mkdir(path.join(project, "products/entry/build/default/outputs/default"), { recursive: true });
  await fs.mkdir(path.join(project, "products/entry/build/default/outputs/ohosTest"), { recursive: true });
  await fs.writeFile(path.join(project, "products/entry/build/default/outputs/default/entry-default-unsigned.hap"), "", "utf-8");
  await fs.writeFile(path.join(project, "products/entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap"), "", "utf-8");
  const commands: string[] = [];

  const result = await runOhosTestMatrix({
    project,
    machineConfigPath,
    out,
    commandExecutor: async (command) => {
      commands.push(command);
      if (command.includes("aa test")) {
        return {
          stdout:
            "OHOS_REPORT_RESULT: stream=Tests run: 25, Failure: 0, Error: 0, Pass: 25, Ignore: 0\nOHOS_REPORT_CODE: 0\n",
          stderr: "",
          exitCode: 0,
          durationMs: 10,
        };
      }
      return { stdout: command.includes("list targets") ? "127.0.0.1:15001\tConnected\n" : "", stderr: "", exitCode: 0, durationMs: 5 };
    },
  });

  assert.equal(result.status, "passed");
  assert.deepEqual(result.devices.map((item) => item.status), ["passed"]);
  assert.match(commands.join("\n"), /\/fake\/hvigorw --mode project -p product=default assembleApp/);
  assert.match(commands.join("\n"), /\/fake\/hvigorw --mode module -p module=entry@ohosTest ohosTest@PackageHap/);
  assert.match(commands.join("\n"), /\/fake\/hdc -t 127\.0\.0\.1:15001 install -r .*entry-default-unsigned\.hap .*entry-ohosTest-unsigned\.hap/);
  assert.match(commands.join("\n"), /\/fake\/hdc -t 127\.0\.0\.1:15001 shell aa test -b zhsc\.1\.xxxxxx -m entry_test/);
  assert.ok(await fs.readFile(out, "utf-8"));
  assert.match(await fs.readFile(path.join(path.dirname(out), "summary.md"), "utf-8"), /Status: passed/);
});

test("runOhosTestMatrix uses configured hvigorw path when project wrapper is absent", async (t) => {
  const project = await makeProject(t);
  await fs.rm(path.join(project, "hvigorw"));
  const machineConfigPath = await makeMachineConfig(project);
  await fs.mkdir(path.join(project, "products/entry/build/default/outputs/default"), { recursive: true });
  await fs.mkdir(path.join(project, "products/entry/build/default/outputs/ohosTest"), { recursive: true });
  await fs.writeFile(path.join(project, "products/entry/build/default/outputs/default/entry-default-unsigned.hap"), "", "utf-8");
  await fs.writeFile(path.join(project, "products/entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap"), "", "utf-8");
  const commands: string[] = [];

  await runOhosTestMatrix({
    project,
    machineConfigPath,
    out: path.join(project, "result.json"),
    commandExecutor: async (command) => {
      commands.push(command);
      return {
        stdout: command.includes("aa test")
          ? "OHOS_REPORT_RESULT: stream=Tests run: 1, Failure: 0, Error: 0, Pass: 1, Ignore: 0\nOHOS_REPORT_CODE: 0\n"
          : command.includes("list targets")
            ? "127.0.0.1:15001\tConnected\n"
            : "",
        stderr: "",
        exitCode: 0,
        durationMs: 1,
      };
    },
  });

  assert.match(commands.join("\n"), /(?:^|\n)\/fake\/hvigorw --mode project -p product=default assembleApp/);
});

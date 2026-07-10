import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runOhosTestCase } from "../src/index.js";

async function makeProject(root: string): Promise<string> {
  const project = path.join(root, "base");
  await fs.mkdir(path.join(project, "AppScope"), { recursive: true });
  await fs.writeFile(
    path.join(project, "AppScope", "app.json5"),
    JSON.stringify({ app: { bundleName: "zhsc.1.xxxxxx" } }),
    "utf-8",
  );
  await fs.writeFile(
    path.join(project, "build-profile.json5"),
    JSON.stringify({
      app: { products: [{ name: "default" }] },
      modules: [{ name: "entry", srcPath: "./products/entry" }],
    }),
    "utf-8",
  );
  await fs.mkdir(
    path.join(project, "products", "entry", "src", "main", "ets"),
    { recursive: true },
  );
  await fs.writeFile(
    path.join(project, "products", "entry", "src", "main", "ets", "Index.ets"),
    "export const state = 'base';\n",
    "utf-8",
  );
  await fs.mkdir(path.join(project, "products", "entry", "src", "ohosTest"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(project, "products", "entry", "src", "ohosTest", "module.json5"),
    JSON.stringify({ module: { name: "entry_test" } }),
    "utf-8",
  );
  await fs.mkdir(
    path.join(project, "products/entry/build/default/outputs/default"),
    { recursive: true },
  );
  await fs.mkdir(
    path.join(project, "products/entry/build/default/outputs/ohosTest"),
    { recursive: true },
  );
  await fs.writeFile(
    path.join(
      project,
      "products/entry/build/default/outputs/default/entry-default-unsigned.hap",
    ),
    "",
    "utf-8",
  );
  await fs.writeFile(
    path.join(
      project,
      "products/entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap",
    ),
    "",
    "utf-8",
  );
  return project;
}

async function writeMachineConfig(root: string): Promise<string> {
  const machineConfigPath = path.join(root, "machine.json");
  await fs.writeFile(
    machineConfigPath,
    JSON.stringify({
      paths: {
        hdc: "/fake/hdc",
        hvigorw: "/fake/hvigorw",
        emulatorBin: "/fake/Emulator",
        emulatorDeployedDir: "/fake/deployed",
      },
      devices: [
        {
          id: "phone",
          target: "127.0.0.1:15001",
          testSuites: ["MachineSuite"],
        },
      ],
    }),
    "utf-8",
  );
  return machineConfigPath;
}

async function writeCase(root: string): Promise<string> {
  const caseDir = path.join(root, "case");
  await fs.mkdir(caseDir, { recursive: true });
  await fs.writeFile(
    path.join(caseDir, "metadata.json"),
    JSON.stringify({
      case_id: "responsive-repeat-layout",
      base_project: "base",
      test_patch: "test_patch.patch",
      golden_patch: "golden_patch.patch",
      fail_to_pass: ["should_adapt"],
      pass_to_pass: ["should_launch"],
      device_test_suites: {
        phone: [
          {
            suite: "MetadataSuite",
            file: "products/entry/src/ohosTest/ets/test/Metadata.test.ets",
          },
        ],
      },
    }),
    "utf-8",
  );
  await fs.writeFile(
    path.join(caseDir, "test_patch.patch"),
    [
      "diff --git a/products/entry/src/main/ets/TestOnly.ets b/products/entry/src/main/ets/TestOnly.ets",
      "new file mode 100644",
      "index 0000000..8f0b6af",
      "--- /dev/null",
      "+++ b/products/entry/src/main/ets/TestOnly.ets",
      "@@ -0,0 +1 @@",
      "+export const testOnly = true;",
      "",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(
    path.join(caseDir, "golden_patch.patch"),
    [
      "diff --git a/products/entry/src/main/ets/Index.ets b/products/entry/src/main/ets/Index.ets",
      "index 2e5ab31..43d9d25 100644",
      "--- a/products/entry/src/main/ets/Index.ets",
      "+++ b/products/entry/src/main/ets/Index.ets",
      "@@ -1 +1 @@",
      "-export const state = 'base';",
      "+export const state = 'answer';",
      "",
    ].join("\n"),
    "utf-8",
  );
  return caseDir;
}

async function writeEnabledDevicesCase(root: string): Promise<string> {
  const caseDir = path.join(root, "case");
  await fs.mkdir(caseDir, { recursive: true });
  await fs.writeFile(
    path.join(caseDir, "metadata.json"),
    JSON.stringify({
      case_id: "responsive-repeat-layout",
      base_project: "base",
      test_patch: "test_patch.patch",
      golden_patch: "golden_patch.patch",
      fail_to_pass: ["should_adapt"],
      pass_to_pass: ["should_launch"],
      enabled_devices: ["phone"],
    }),
    "utf-8",
  );
  await fs.writeFile(
    path.join(caseDir, "test_patch.patch"),
    [
      "diff --git a/products/entry/src/main/ets/TestOnly.ets b/products/entry/src/main/ets/TestOnly.ets",
      "new file mode 100644",
      "index 0000000..8f0b6af",
      "--- /dev/null",
      "+++ b/products/entry/src/main/ets/TestOnly.ets",
      "@@ -0,0 +1 @@",
      "+export const testOnly = true;",
      "",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(
    path.join(caseDir, "golden_patch.patch"),
    [
      "diff --git a/products/entry/src/main/ets/Index.ets b/products/entry/src/main/ets/Index.ets",
      "index 2e5ab31..43d9d25 100644",
      "--- a/products/entry/src/main/ets/Index.ets",
      "+++ b/products/entry/src/main/ets/Index.ets",
      "@@ -1 +1 @@",
      "-export const state = 'base';",
      "+export const state = 'answer';",
      "",
    ].join("\n"),
    "utf-8",
  );
  return caseDir;
}

test("runOhosTestCase applies test and golden patches, runs swe and answer, and writes a case report", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "ohostest-case-runner-"),
  );
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await makeProject(root);
  const caseDir = await writeCase(root);
  const machineConfigPath = await writeMachineConfig(root);
  const out = path.join(root, "runs", "result");
  const commands: string[] = [];

  const result = await runOhosTestCase({
    caseDir,
    machineConfigPath,
    out,
    runMode: "all",
    keepWorkdir: true,
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

  assert.equal(result.schemaVersion, "ohostest-case-v1");
  assert.equal(result.status, "completed");
  assert.equal(result.runs.swe?.status, "completed");
  assert.equal(result.runs.answer?.status, "completed");
  assert.ok(result.artifacts.sweResult);
  assert.ok(result.artifacts.answerResult);
  assert.ok(await fs.readFile(path.join(out, "result.json"), "utf-8"));
  assert.match(
    await fs.readFile(path.join(out, "summary.md"), "utf-8"),
    /responsive-repeat-layout/,
  );
  assert.equal(
    result.artifacts.result,
    path.relative(caseDir, path.join(out, "result.json")),
  );
  assert.equal(
    result.artifacts.sweResult,
    path.relative(caseDir, path.join(out, "swe", "result.json")),
  );
  assert.equal(
    commands.filter((command) => command.includes("aa test")).length,
    2,
  );
  assert.equal(
    commands.filter((command) => command === "ohpm install").length,
    2,
  );
  assert.ok(commands.every((command) => !command.includes("MachineSuite")));
  assert.equal(
    commands.filter((command) => command.includes("-s class MetadataSuite"))
      .length,
    2,
  );
  assert.match(
    await fs.readFile(
      path.join(
        result.artifacts.workdir ?? "",
        "products/entry/src/main/ets/Index.ets",
      ),
      "utf-8",
    ),
    /answer/,
  );
});

test("runOhosTestCase defaults to answer run only", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "ohostest-case-runner-answer-"),
  );
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await makeProject(root);
  const caseDir = await writeCase(root);
  const machineConfigPath = await writeMachineConfig(root);
  const out = path.join(root, "runs");
  const commands: string[] = [];

  const result = await runOhosTestCase({
    caseDir,
    machineConfigPath,
    out,
    keepWorkdir: true,
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

  assert.equal(result.status, "completed");
  assert.equal(result.runs.swe, undefined);
  assert.equal(result.runs.answer?.status, "completed");
  assert.equal(result.artifacts.sweResult, undefined);
  assert.ok(result.artifacts.answerResult);
  assert.equal(
    commands.filter((command) => command.includes("aa test")).length,
    1,
  );
  assert.equal(
    commands.filter((command) => command === "ohpm install").length,
    1,
  );
  assert.match(
    await fs.readFile(
      path.join(
        result.artifacts.workdir ?? "",
        "products/entry/src/main/ets/Index.ets",
      ),
      "utf-8",
    ),
    /answer/,
  );
  assert.match(await fs.readFile(path.join(out, "summary.md"), "utf-8"), /\| swe \| not run \|/);
});

test("runOhosTestCase can run swe without applying golden patch", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "ohostest-case-runner-swe-"),
  );
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await makeProject(root);
  const caseDir = await writeCase(root);
  const machineConfigPath = await writeMachineConfig(root);
  const out = path.join(root, "runs");
  const commands: string[] = [];

  const result = await runOhosTestCase({
    caseDir,
    machineConfigPath,
    out,
    runMode: "swe",
    keepWorkdir: true,
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

  assert.equal(result.status, "completed");
  assert.equal(result.runs.swe?.status, "completed");
  assert.equal(result.runs.answer, undefined);
  assert.ok(result.artifacts.sweResult);
  assert.equal(result.artifacts.answerResult, undefined);
  assert.equal(
    commands.filter((command) => command.includes("aa test")).length,
    1,
  );
  assert.equal(
    commands.filter((command) => command.includes("golden_patch.patch"))
      .length,
    0,
  );
  assert.match(
    await fs.readFile(
      path.join(
        result.artifacts.workdir ?? "",
        "products/entry/src/main/ets/Index.ets",
      ),
      "utf-8",
    ),
    /base/,
  );
});

test("runOhosTestCase writes default reports under the case directory", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "ohostest-case-default-out-"),
  );
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await makeProject(root);
  const caseDir = await writeCase(root);
  const machineConfigPath = await writeMachineConfig(root);

  const result = await runOhosTestCase({
    caseDir,
    machineConfigPath,
    commandExecutor: async (command) => ({
      stdout: command.includes("aa test")
        ? "OHOS_REPORT_RESULT: stream=Tests run: 1, Failure: 0, Error: 0, Pass: 1, Ignore: 0\nOHOS_REPORT_CODE: 0\n"
        : command.includes("list targets")
          ? "127.0.0.1:15001\tConnected\n"
          : "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    }),
  });

  assert.match(result.artifacts.result, /^\.ohostest-runs\/.+\/result\.json$/);
  assert.equal(
    result.artifacts.result,
    result.artifacts.summary.replace(/summary\.md$/, "result.json"),
  );
  const resultPath = path.join(caseDir, result.artifacts.result);
  const summaryPath = path.join(caseDir, result.artifacts.summary);
  assert.equal(
    JSON.parse(await fs.readFile(resultPath, "utf-8")).caseId,
    "responsive-repeat-layout",
  );
  assert.match(
    await fs.readFile(summaryPath, "utf-8"),
    /responsive-repeat-layout/,
  );
});

test("runOhosTestCase uses enabled devices for full test runs", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "ohostest-case-runner-enabled-"),
  );
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await makeProject(root);
  const caseDir = await writeEnabledDevicesCase(root);
  const machineConfigPath = await writeMachineConfig(root);
  const commands: string[] = [];

  const result = await runOhosTestCase({
    caseDir,
    machineConfigPath,
    out: path.join(root, "runs"),
    runMode: "all",
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

  assert.equal(result.status, "completed");
  assert.deepEqual(
    result.runs.swe?.devices.map((device) => device.id),
    ["phone"],
  );
  assert.equal(
    commands.filter((command) => command.includes("aa test")).length,
    2,
  );
  assert.ok(commands.every((command) => !command.includes("-s class")));
  assert.ok(commands.every((command) => !command.includes("MachineSuite")));
});

test("runOhosTestCase writes case command log when golden patch fails before answer run", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "ohostest-case-patch-failure-log-"),
  );
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  await makeProject(root);
  const caseDir = await writeCase(root);
  await fs.writeFile(
    path.join(caseDir, "golden_patch.patch"),
    [
      "diff --git a/products/entry/src/main/ets/TestOnly.ets b/products/entry/src/main/ets/TestOnly.ets",
      "new file mode 100644",
      "index 0000000..8f0b6af",
      "--- /dev/null",
      "+++ b/products/entry/src/main/ets/TestOnly.ets",
      "@@ -0,0 +1 @@",
      "+export const duplicate = true;",
      "",
    ].join("\n"),
    "utf-8",
  );
  const machineConfigPath = await writeMachineConfig(root);
  const out = path.join(root, "runs");

  const result = await runOhosTestCase({
    caseDir,
    machineConfigPath,
    out,
    runMode: "all",
    keepWorkdir: true,
    commandExecutor: async (command) => ({
      stdout: command.includes("aa test")
        ? "OHOS_REPORT_RESULT: stream=Tests run: 1, Failure: 0, Error: 0, Pass: 1, Ignore: 0\nOHOS_REPORT_CODE: 0\n"
        : command.includes("list targets")
          ? "127.0.0.1:15001\tConnected\n"
          : "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    }),
  });

  const commandLog = await fs.readFile(
    path.join(out, "commands.log"),
    "utf-8",
  );
  const summary = await fs.readFile(path.join(out, "summary.md"), "utf-8");

  assert.equal(result.status, "failed");
  assert.ok(result.runs.swe);
  assert.equal(result.runs.answer, undefined);
  assert.equal(
    result.artifacts.commandLog,
    path.relative(caseDir, path.join(out, "commands.log")),
  );
  assert.match(commandLog, /git apply --ignore-whitespace --check/);
  assert.match(commandLog, /golden_patch\.patch/);
  assert.match(commandLog, /exitCode: [1-9]/);
  assert.match(commandLog, /stderr:\n.+/s);
  assert.match(summary, /patch_apply_failed: golden_patch/);
  assert.match(summary, /Command Log: \.\.\/runs\/commands\.log/);
  assert.doesNotMatch(summary, /stderr:\n/);
});

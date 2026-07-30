import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runOhosTestMatrix } from "../src/matrix/runner.js";

async function makeProject(
  t: test.TestContext,
  options: { withSharedModule?: boolean } = {},
): Promise<string> {
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
      modules: [
        { name: "entry", srcPath: "./products/entry" },
        ...(options.withSharedModule
          ? [{ name: "common", srcPath: "./commons/common" }]
          : []),
      ],
    }),
    "utf-8",
  );
  await fs.mkdir(path.join(root, "products", "entry", "src", "main"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, "products", "entry", "hvigorfile.ts"),
    "import { hapTasks } from '@ohos/hvigor-ohos-plugin';\nexport default { system: hapTasks, plugins: [] };\n",
    "utf-8",
  );
  await fs.writeFile(
    path.join(root, "products", "entry", "src", "main", "module.json5"),
    JSON.stringify({ module: { name: "entry", type: "entry" } }),
    "utf-8",
  );
  if (options.withSharedModule) {
    await fs.mkdir(path.join(root, "commons", "common", "src", "main"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(root, "commons", "common", "src", "main", "module.json5"),
      JSON.stringify({ module: { name: "common", type: "shared" } }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(root, "commons", "common", "oh-package.json5"),
      JSON.stringify({ name: "common", dependencies: {} }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(root, "commons", "common", "hvigorfile.ts"),
      "import { hspTasks } from '@ohos/hvigor-ohos-plugin';\nexport default { system: hspTasks, plugins: [] };\n",
      "utf-8",
    );
    const commonOutput = path.join(
      root,
      "commons/common/build/default/outputs/default",
    );
    await fs.mkdir(commonOutput, { recursive: true });
    await fs.writeFile(
      path.join(commonOutput, "common-default-unsigned.hsp"),
      "",
      "utf-8",
    );
  }
  await fs.mkdir(path.join(root, "products", "entry", "src", "ohosTest"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, "products", "entry", "src", "ohosTest", "module.json5"),
    JSON.stringify({ module: { name: "entry_test" } }),
    "utf-8",
  );
  await fs.mkdir(path.join(root, "entry/build/default/outputs/default"), {
    recursive: true,
  });
  await fs.mkdir(path.join(root, "entry/build/default/outputs/ohosTest"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(
      root,
      "entry/build/default/outputs/default/entry-default-unsigned.hap",
    ),
    "",
    "utf-8",
  );
  await fs.writeFile(
    path.join(
      root,
      "entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap",
    ),
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
      paths: {
        hdc: "/fake/hdc",
        hvigorw: "/fake/hvigorw",
        ohpm: "/fake/ohpm",
        emulatorBin: "/fake/Emulator",
        emulatorDeployedDir: "/fake/deployed",
      },
      devices: [
        {
          id: "phone",
          target: "127.0.0.1:15001",
          profile: "Mate 80 Pro",
          hdcPort: 15001,
        },
      ],
    }),
    "utf-8",
  );
  return machineConfigPath;
}

test("runOhosTestMatrix builds, installs, runs tests, and writes artifacts", async (t) => {
  const project = await makeProject(t, { withSharedModule: true });
  const machineConfigPath = await makeMachineConfig(project);
  const out = path.join(project, ".ohostest-runs/latest/result.json");
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
      return {
        stdout: command.includes("list targets")
          ? "127.0.0.1:15001\tConnected\n"
          : "",
        stderr: "",
        exitCode: 0,
        durationMs: 5,
      };
    },
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(
    result.devices.map((item) => item.status),
    ["passed"],
  );
  assert.ok(commands.some((command) => command.includes("aa test")));
  assert.ok(await fs.readFile(out, "utf-8"));
  assert.match(
    await fs.readFile(path.join(path.dirname(out), "summary.md"), "utf-8"),
    /Status: completed/,
  );
  assert.equal(result.artifacts.commandLog, "commands.jsonl");
  assert.equal(result.devices[0]?.log, "commands.jsonl");
  const logEvents = (
    await fs.readFile(path.join(path.dirname(out), "commands.jsonl"), "utf-8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.ok(logEvents.every((event) => event.phase === "matrix"));
  assert.ok(
    logEvents.some(
      (event) =>
        event.deviceId === "phone" &&
        event.suiteClass === "ALL" &&
        String(event.command).includes("aa test"),
    ),
  );
  assert.equal(
    logEvents.filter((event) => String(event.command).includes("list targets"))
      .length,
    1,
  );
});

test("runOhosTestMatrix persists structured configuration failures", async (t) => {
  const project = await makeProject(t);
  const machineConfigPath = path.join(project, "invalid-machine.json");
  const out = path.join(project, "config-error", "result.json");
  await fs.writeFile(machineConfigPath, "{ invalid", "utf-8");

  const result = await runOhosTestMatrix({
    project,
    machineConfigPath,
    out,
  });

  assert.equal(result.status, "failed");
  assert.match(result.diagnostics[0] ?? "", /config_file_parse_failed/);
  assert.match(await fs.readFile(out, "utf-8"), /config_file_parse_failed/);
  const events = (
    await fs.readFile(path.join(path.dirname(out), "commands.jsonl"), "utf-8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.equal(events[0]?.event, "runner_error");
  assert.equal(events[0]?.errorCode, "CONFIG_PARSE_ERROR");
  assert.equal(events[0]?.file, path.resolve(machineConfigPath));
});

test("runOhosTestMatrix blocks install output errors before aa test", async (t) => {
  const project = await makeProject(t, { withSharedModule: true });
  const machineConfigPath = await makeMachineConfig(project);
  const out = path.join(project, "install-error/result.json");
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
  const commands: string[] = [];

  const result = await runOhosTestMatrix({
    project,
    machineConfigPath,
    out,
    commandExecutor: async (command) => {
      commands.push(command);
      if (command.includes(" install -r ")) {
        return {
          stdout:
            "[Info]App install path:entry.hap msg:error: failed to install bundle. code:9568305 error: Failed to install the HAP or HSP because the dependent module does not exist. entry's dependent module: common does not exist",
          stderr: "",
          exitCode: 0,
          durationMs: 1,
        };
      }
      return {
        stdout: command.includes("list targets")
          ? "127.0.0.1:15001\tConnected\n"
          : "",
        stderr: "",
        exitCode: 0,
        durationMs: 1,
      };
    },
  });

  assert.equal(result.devices[0]?.status, "blocked");
  assert.equal(result.devices[0]?.blockedReason, "install_failed");
  assert.equal(
    commands.some((command) => command.includes("aa test")),
    false,
  );
});

test("runOhosTestMatrix waits five seconds after stopping one emulator before starting the next", async (t) => {
  const project = await makeProject(t);
  const fakeEmulator = path.join(project, "FakeEmulator.sh");
  await fs.writeFile(fakeEmulator, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const machineConfigPath = path.join(project, "serial-emulators.json");
  await fs.writeFile(
    machineConfigPath,
    JSON.stringify({
      paths: {
        hdc: "/fake/hdc",
        hvigorw: "/fake/hvigorw",
        emulatorBin: fakeEmulator,
        emulatorDeployedDir: "/fake/deployed",
      },
      devices: [
        {
          id: "phone",
          target: "127.0.0.1:15001",
          profile: "Mate 80 Pro",
          hdcPort: 15001,
          startEmulator: true,
        },
        {
          id: "tablet",
          target: "127.0.0.1:15003",
          profile: "MatePad Pro 13",
          hdcPort: 15003,
          startEmulator: true,
        },
      ],
    }),
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

  let aaTestCount = 0;
  let returnedDisconnectedAfterFirstStop = false;
  const result = await runOhosTestMatrix({
    project,
    machineConfigPath,
    out: path.join(project, "result.json"),
    commandExecutor: async (command) => {
      if (command.includes("aa test")) {
        aaTestCount += 1;
      }
      let listTargetsOutput = "";
      if (command.includes("list targets")) {
        if (aaTestCount === 0) {
          listTargetsOutput = "127.0.0.1:15001\tConnected\n";
        } else if (!returnedDisconnectedAfterFirstStop) {
          returnedDisconnectedAfterFirstStop = true;
        } else if (aaTestCount < 2) {
          listTargetsOutput = "127.0.0.1:15003\tConnected\n";
        }
      }
      return {
        stdout: command.includes("aa test")
          ? "OHOS_REPORT_RESULT: stream=Tests run: 1, Failure: 0, Error: 0, Pass: 1, Ignore: 0\nOHOS_REPORT_CODE: 0\n"
          : listTargetsOutput,
        stderr: "",
        exitCode: 0,
        durationMs: 1,
      };
    },
  });

  assert.equal(result.devices.length, 2);
  assert.ok(result.durationMs >= 5000);
});

test("runOhosTestMatrix runs configured test suites separately and aggregates results", async (t) => {
  const project = await makeProject(t);
  const machineConfigPath = path.join(project, "suites.json");
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
          id: "foldable",
          target: "127.0.0.1:15002",
          profile: "Mate X7",
          hdcPort: 15002,
          testSuites: [
            "CommonPassToPassTest",
            "SmPassToPassTest",
            "MdFailToPassTest",
          ],
        },
      ],
    }),
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
  const commands: string[] = [];

  const result = await runOhosTestMatrix({
    project,
    machineConfigPath,
    out: path.join(project, "result.json"),
    commandExecutor: async (command) => {
      commands.push(command);
      if (command.includes("CommonPassToPassTest")) {
        return {
          stdout:
            "OHOS_REPORT_RESULT: stream=Tests run: 10, Failure: 0, Error: 0, Pass: 10, Ignore: 0\nOHOS_REPORT_CODE: 0\n",
          stderr: "",
          exitCode: 0,
          durationMs: 10,
        };
      }
      if (command.includes("SmPassToPassTest")) {
        return {
          stdout:
            "OHOS_REPORT_RESULT: stream=Tests run: 6, Failure: 0, Error: 0, Pass: 5, Ignore: 1\nOHOS_REPORT_CODE: 0\n",
          stderr: "",
          exitCode: 0,
          durationMs: 10,
        };
      }
      if (command.includes("MdFailToPassTest")) {
        return {
          stdout: [
            "OHOS_REPORT_STATUS: class=MdFailToPassTest",
            "OHOS_REPORT_STATUS: current=1",
            "OHOS_REPORT_STATUS: stack=    at AssertException @ohos/hypium (service.js:23:9)",
            "    at should_adapt_medium (MdFailToPass.test.ets:42:7)",
            "OHOS_REPORT_STATUS: stream=Error in should_adapt_medium, expect true, actualValue is false",
            "OHOS_REPORT_STATUS: test=should_adapt_medium",
            "OHOS_REPORT_STATUS_CODE: -2",
            "OHOS_REPORT_STATUS: consuming=239",
            "OHOS_REPORT_RESULT: stream=Tests run: 5, Failure: 2, Error: 0, Pass: 3, Ignore: 0",
            "OHOS_REPORT_CODE: 1",
            "",
          ].join("\n"),
          stderr: "",
          exitCode: 0,
          durationMs: 10,
        };
      }
      return {
        stdout: command.includes("list targets")
          ? "127.0.0.1:15002\tConnected\n"
          : "",
        stderr: "",
        exitCode: 0,
        durationMs: 1,
      };
    },
  });

  const aaCommands = commands.filter((command) => command.includes("aa test"));
  assert.deepEqual(
    aaCommands.map((command) => /-s class ([A-Za-z0-9_]+)/.exec(command)?.[1]),
    ["CommonPassToPassTest", "SmPassToPassTest", "MdFailToPassTest"],
  );
  assert.equal(result.devices[0]?.status, "failed");
  assert.equal(result.devices[0]?.testsRun, 21);
  assert.equal(result.devices[0]?.failures, 2);
  assert.equal(result.devices[0]?.passes, 18);
  assert.equal(result.devices[0]?.ignored, 1);
  assert.deepEqual(result.devices[0]?.suiteResults[2]?.testCases[0], {
    name: "should_adapt_medium",
    status: "failed",
    statusCode: -2,
    durationMs: 239,
    message: "Error in should_adapt_medium, expect true, actualValue is false",
    stack:
      "at AssertException @ohos/hypium (service.js:23:9)\n    at should_adapt_medium (MdFailToPass.test.ets:42:7)",
  });
  assert.deepEqual(
    result.devices[0]?.suiteResults.map((suite) => [
      suite.suiteClass,
      suite.status,
      suite.testsRun,
      suite.reportCode,
    ]),
    [
      ["CommonPassToPassTest", "passed", 10, 0],
      ["SmPassToPassTest", "passed", 6, 0],
      ["MdFailToPassTest", "failed", 5, 1],
    ],
  );
  const events = (
    await fs.readFile(path.join(project, "commands.jsonl"), "utf-8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  const failedTest = events.find(
    (event) =>
      event.event === "test_case" && event.test === "should_adapt_medium",
  );
  assert.equal(failedTest?.level, 50);
  assert.match(String(failedTest?.message), /actualValue is false/);
  assert.match(String(failedTest?.stack), /MdFailToPass\.test\.ets:42/);
  const testCommand = events.find(
    (event) =>
      event.event === "command" &&
      String(event.command).includes("MdFailToPassTest"),
  );
  assert.equal(testCommand?.stdout, undefined);
});

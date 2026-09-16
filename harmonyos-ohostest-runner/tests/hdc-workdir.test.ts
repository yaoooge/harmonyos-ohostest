import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { defaultCommandExecutor } from "../src/execution/command.js";
import { withHdcWorkingDirectory } from "../src/execution/hdc.js";
import { runExecution } from "../src/execution/runner.js";
import { shellQuote } from "../src/execution/utils/shellQuote.js";
import type {
  CommandExecutor,
  ExecutionConfig,
} from "../src/execution/types/index.js";
import { RunnerLogger } from "../src/logging/logger.js";

const ok = { stdout: "", stderr: "", exitCode: 0, durationMs: 0 };

for (const platform of ["darwin", "linux"] as const) {
  test(`${platform} keeps the original command executor`, () => {
    const executor: CommandExecutor = async () => ok;
    assert.equal(
      withHdcWorkingDirectory(executor, "./hdc", platform),
      executor,
    );
  });
}

test("Windows changes only the configured executable token, preserving arguments", async () => {
  const hdc = "C:\\DevEco Studio\\toolchains\\hdc.exe";
  const prefix = shellQuote(hdc, "win32");
  const calls: Array<{ command: string; cwd: string }> = [];
  const execute = withHdcWorkingDirectory(
    async (command, cwd) => {
      calls.push({ command, cwd });
      return ok;
    },
    hdc,
    "win32",
  );
  const commands = [
    `${prefix} list targets`,
    `${prefix} -t device install -r "E:\\work folder\\app.hap"`,
    `hvigorw --argument ${prefix}`,
    `${shellQuote(`${hdc}.other`, "win32")} list targets`,
  ];
  for (const command of commands) await execute(command, "E:\\work");
  assert.deepEqual(
    calls.map((call) => call.command),
    commands,
  );
  assert.deepEqual(
    calls.map((call) => call.cwd),
    [os.tmpdir(), os.tmpdir(), "E:\\work", "E:\\work"],
  );
});

for (const hdc of [".\\tools\\hdc.exe", "tools/hdc.exe", "\\tools\\hdc.exe"]) {
  test(`Windows resolves ${hdc} before changing cwd`, async () => {
    const execute = withHdcWorkingDirectory(
      async (command, cwd) => {
        assert.equal(
          command,
          `${shellQuote(path.win32.resolve("E:\\work", hdc), "win32")} list targets`,
        );
        assert.equal(cwd, os.tmpdir());
        return ok;
      },
      hdc,
      "win32",
    );
    await execute(`${shellQuote(hdc, "win32")} list targets`, "E:\\work");
  });
}

test(
  "Windows preserves current-directory executable lookup and PATH fallback",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await makeRoot(t);
    await fs.writeFile(path.join(root, "hdc.exe"), "fixture");
    const commands: string[] = [];
    const execute = withHdcWorkingDirectory(async (command) => {
      commands.push(command);
      return ok;
    }, "hdc");
    await execute("hdc list targets", root);
    await fs.unlink(path.join(root, "hdc.exe"));
    await execute("hdc list targets", root);
    assert.equal(
      commands[0]?.toLowerCase(),
      `${shellQuote(path.join(root, "hdc.exe"))} list targets`.toLowerCase(),
    );
    assert.equal(commands[1], "hdc list targets");
  },
);

async function makeRoot(t: test.TestContext): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "runner-hdc-cwd-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

async function executionFixture(root: string): Promise<ExecutionConfig> {
  const project = path.join(root, "work", "base");
  await fs.mkdir(project, { recursive: true });
  const artifacts = {
    appHap: path.join(project, "app-unsigned.hap"),
    testHap: path.join(project, "test-unsigned.hap"),
  };
  await Promise.all(
    Object.values(artifacts).map((file) => fs.writeFile(file, "fixture")),
  );
  return {
    project,
    artifacts,
    product: "default",
    module: "entry",
    moduleSrcPath: "entry",
    sharedModules: [],
    bundleName: "test.fixture",
    testModule: "entry_test",
    testRunner: "runner",
    testCaseTimeoutMs: 1000,
    timeoutMs: 1000,
    build: {
      mode: "project",
      appTask: "assembleApp",
      testTask: "ohosTest@PackageHap",
    },
    paths: {
      hdc: path.join(root, "SDK tools", "hdc.exe"),
      hvigorw: "hvigorw",
      ohpm: "ohpm",
      emulatorBin: "Emulator",
      emulatorDeployedDir: root,
    },
    devices: [{ id: "phone", target: "fixture-device", startEmulator: false }],
  };
}

test("execution routes polling, install, unlock retry, test and Web forwarding through the HDC cwd", async (t) => {
  const root = await makeRoot(t);
  const config = await executionFixture(root);
  const logger = RunnerLogger.create(path.join(root, "commands.jsonl"));
  const calls: Array<{ command: string; cwd: string }> = [];
  let forwarding = false;
  let testAttempts = 0;
  try {
    const result = await runExecution({
      config,
      plan: { devices: config.devices },
      outDir: root,
      logger,
      webServerPort: 5175,
      commandExecutor: async (command, cwd) => {
        calls.push({ command, cwd });
        if (command.includes(" rport ")) forwarding = true;
        if (command.includes(" fport rm ")) forwarding = false;
        if (command.includes(" fport ls"))
          return {
            ...ok,
            stdout: forwarding ? "tcp:5175 tcp:5175 [Reverse]" : "",
          };
        if (command.includes(" list targets"))
          return { ...ok, stdout: "fixture-device\tConnected" };
        if (command.includes(" shell aa test")) {
          testAttempts++;
          return testAttempts === 1
            ? { ...ok, exitCode: 1, stderr: "device screen is locked" }
            : {
                ...ok,
                stdout:
                  "Tests run: 1, Failure: 0, Error: 0, Pass: 1, Ignore: 0\nOHOS_REPORT_CODE: 0",
              };
        }
        return ok;
      },
    });
    assert.equal(result.devices[0]?.status, "passed");
  } finally {
    await logger.close();
  }
  const hdcCalls = calls.filter(({ command }) =>
    command.startsWith(shellQuote(config.paths.hdc)),
  );
  const buildCalls = calls.filter((call) => !hdcCalls.includes(call));
  assert.equal(testAttempts, 2);
  assert.equal(forwarding, false);
  assert.ok(
    hdcCalls.some(
      ({ command }) =>
        command.includes(" install -r ") &&
        command.includes(shellQuote(config.artifacts.appHap)),
    ),
  );
  assert.ok(hdcCalls.some(({ command }) => command.includes(" fport rm ")));
  assert.ok(
    hdcCalls.every(
      ({ cwd }) =>
        cwd === (process.platform === "win32" ? os.tmpdir() : config.project),
    ),
  );
  assert.equal(buildCalls.length, 4);
  assert.ok(buildCalls.every(({ cwd }) => cwd === config.project));
});

test(
  "Windows cwd inheritance reproduces the lock; stable cwd permits cleanup while the owned server remains alive",
  { skip: process.platform !== "win32", timeout: 15000 },
  async (t) => {
    const root = await makeRoot(t);
    const script = path.join(root, "background-fixture.cjs");
    await fs.writeFile(
      script,
      `
    const fs = require('node:fs');
    if (process.argv[2] === 'server') {
      fs.writeFileSync(process.argv[3], JSON.stringify({pid: process.pid, cwd: process.cwd()}));
      setInterval(() => {}, 1000);
    } else {
      const child = require('node:child_process').spawn(process.execPath, [__filename, 'server', process.argv[2]], {
        detached: true, windowsHide: true, stdio: 'ignore'
      });
      fs.writeFileSync(process.argv[2] + '.pid', String(child.pid));
      child.unref();
    }
  `,
    );
    for (const stable of [false, true]) {
      const project = path.join(root, stable ? "fixed" : "before");
      await fs.mkdir(project);
      const stateFile = path.join(root, stable ? "fixed.json" : "before.json");
      const executor = stable
        ? withHdcWorkingDirectory(defaultCommandExecutor, process.execPath)
        : defaultCommandExecutor;
      try {
        const result = await executor(
          `${shellQuote(process.execPath)} ${shellQuote(script)} ${shellQuote(stateFile)}`,
          project,
        );
        assert.equal(result.exitCode, 0, result.stderr);
        let state: { pid: number; cwd: string } | undefined;
        for (let attempt = 0; attempt < 100 && !state; attempt++) {
          state = await fs
            .readFile(stateFile, "utf8")
            .then(JSON.parse)
            .catch(() => undefined);
          if (!state) await delay(25);
        }
        assert.ok(state, "owned background fixture became ready");
        assert.equal(
          state.cwd.toLowerCase(),
          (stable ? os.tmpdir() : project).toLowerCase(),
        );
        if (stable) await fs.rmdir(project);
        else await assert.rejects(fs.rmdir(project), { code: "EBUSY" });
        assert.equal(process.kill(state.pid, 0), true);
      } finally {
        const pid = Number(
          await fs.readFile(`${stateFile}.pid`, "utf8").catch(() => ""),
        );
        if (pid > 0) {
          try {
            process.kill(pid);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
          }
          for (let attempt = 0; attempt < 100; attempt++) {
            try {
              process.kill(pid, 0);
            } catch {
              break;
            }
            await delay(25);
          }
        }
      }
    }
  },
);

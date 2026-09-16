import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test, { type TestContext } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import {
  startProcess,
  stopProcess,
  type OwnedProcess,
} from "../src/case/web/process.js";
import { assertPortFree } from "../src/case/web/readiness.js";
import {
  loadWindowsJob,
  windowsCommand,
  windowsEnvironment,
} from "../src/case/web/windowsJob.js";

const windows = { skip: process.platform !== "win32", timeout: 20000 };

test(
  "Windows termination errors retain ownership and allow an explicit retry",
  windows,
  async (t) => {
    const f = await fixture(t);
    const owned = f.start(["-e", "setInterval(()=>{},1000)"]);
    const api = loadWindowsJob();
    const terminate = api.terminate;
    api.terminate = () => {
      throw new Error("fixture termination denied");
    };
    try {
      await assert.rejects(stopProcess(owned), /fixture termination denied/);
      assert.deepEqual(owned.windowsJob?.refresh(), { active: 1, code: null });
    } finally {
      api.terminate = terminate;
      await stopProcess(owned);
    }
    assert.deepEqual(owned.windowsJob?.refresh(), { active: 0, code: 1 });
  },
);

async function until<T>(
  read: () => Promise<T>,
  accept: (value: T) => boolean,
): Promise<T> {
  const deadline = performance.now() + 8000;
  while (true) {
    const value = await read();
    if (accept(value)) return value;
    if (performance.now() >= deadline)
      throw new Error("fixture wait timed out");
    await sleep(25);
  }
}

async function fixture(t: TestContext) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "web-job-中文 "));
  const owned: OwnedProcess[] = [];
  t.after(async () => {
    for (const job of owned) await stopProcess(job);
    await fs.rm(root, { recursive: true, force: true });
  });
  const start = (args: string[], env?: NodeJS.ProcessEnv) => {
    const job = startProcess({
      file: process.execPath,
      args,
      cwd: root,
      env,
      log: path.join(root, `${owned.length}.log`),
    });
    owned.push(job);
    return job;
  };
  return { root, start };
}

async function writeTree(root: string) {
  const marker = path.join(root, "leaf.json");
  const leaf = path.join(root, "leaf.cjs");
  await fs.writeFile(
    leaf,
    `
    const http = require('node:http');
    process.on('SIGTERM', () => {}); process.on('SIGINT', () => {});
    const server = http.createServer((req, res) => res.end('owned leaf'));
    server.listen(0, '127.0.0.1', () => require('node:fs').writeFileSync(
      ${JSON.stringify(marker)}, JSON.stringify({pid:process.pid, port:server.address().port})));
    setTimeout(() => process.exit(99), 30000); // Bounded fixture safety net.
  `,
  );
  const parent = path.join(root, "parent.cjs");
  await fs.writeFile(
    parent,
    `
    const child = require('node:child_process').spawn(process.execPath, [${JSON.stringify(leaf)}],
      {detached:true, windowsHide:true, stdio:'ignore'});
    child.unref(); process.exit(23);
  `,
  );
  return { marker, parent };
}

async function readLeaf(marker: string) {
  const value = await until(
    () => fs.readFile(marker, "utf8").catch(() => ""),
    Boolean,
  );
  return JSON.parse(value) as { pid: number; port: number };
}

test(
  "Windows Job terminates detached descendants after the root has already exited",
  windows,
  async (t) => {
    const f = await fixture(t);
    const { parent, marker } = await writeTree(f.root);
    const owned = f.start([parent]);
    assert.equal((await owned.closed).code, 23);
    const leaf = await readLeaf(marker);
    t.diagnostic(`Owned root=${owned.child.pid}, detached leaf=${leaf.pid}`);
    const url = `http://127.0.0.1:${leaf.port}`;
    assert.equal(await (await fetch(url)).text(), "owned leaf");
    assert.deepEqual(owned.windowsJob?.refresh(), { active: 1, code: 23 });
    // Another listener is outside the Job and must remain alive.
    const other = net.createServer();
    await new Promise<void>((resolve) => other.listen(0, "127.0.0.1", resolve));
    try {
      const stopping = stopProcess(owned);
      assert.equal(stopProcess(owned), stopping);
      await stopping;
      assert.deepEqual(owned.windowsJob?.refresh(), { active: 0, code: 23 });
      await assertPortFree(url);
      assert.ok(other.listening);
    } finally {
      other.close();
    }
  },
);

test(
  "Windows closes the Job when its Runner owner is forcibly killed",
  windows,
  async (t) => {
    const f = await fixture(t);
    const { parent, marker } = await writeTree(f.root);
    const ownerScript = path.join(f.root, "owner.mjs");
    const ownerReady = path.join(f.root, "owner-ready");
    await fs.writeFile(
      ownerScript,
      `
    import fs from 'node:fs';
    import {startProcess} from ${JSON.stringify(new URL("../src/case/web/process.js", import.meta.url).href)};
    globalThis.owned = startProcess(${JSON.stringify({ file: process.execPath, args: [parent], cwd: f.root, log: path.join(f.root, "owner.log") })});
    await globalThis.owned.closed;
    fs.writeFileSync(${JSON.stringify(ownerReady)}, 'ready');
    setInterval(() => {}, 1000);
  `,
    );
    // Ordinary spawn: no enclosing test Job can mask KILL_ON_JOB_CLOSE behavior.
    const owner = spawn(
      process.execPath,
      [...process.execArgv.filter((arg) => arg !== "--test"), ownerScript],
      {
        cwd: process.cwd(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    owner.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    const exited = once(owner, "exit");
    t.after(async () => {
      if (owner.exitCode === null && owner.signalCode === null)
        owner.kill("SIGKILL");
      await exited;
    });
    await until(async () => {
      if (owner.exitCode !== null) throw new Error(`owner exited: ${output}`);
      return fs.readFile(ownerReady, "utf8").catch(() => "");
    }, Boolean);
    const leaf = await readLeaf(marker);
    const url = `http://127.0.0.1:${leaf.port}`;
    assert.equal(await (await fetch(url)).text(), "owned leaf");
    t.diagnostic(
      `Kill only owner=${owner.pid}; orphan leaf=${leaf.pid} must disappear`,
    );
    assert.ok(owner.kill("SIGKILL"));
    await exited;
    await until(
      () =>
        assertPortFree(url).then(
          () => true,
          () => false,
        ),
      Boolean,
    );
  },
);

test(
  "Windows Job preserves arguments, Unicode paths, environment and exit code 259",
  windows,
  async (t) => {
    const f = await fixture(t);
    const args = [
      "",
      "space value",
      'a"b',
      "尾部\\",
      'slash\\"quote',
      "&%|<>^",
    ];
    const owned = f.start(
      [
        "-e",
        "console.log(JSON.stringify({args:process.argv.slice(1),env:process.env.JOB_TEST}));process.exit(259)",
        "--",
        ...args,
      ],
      { ...process.env, JOB_TEST: '中文 value = "x"' },
    );
    assert.equal((await owned.closed).code, 259);
    await stopProcess(owned);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(f.root, "0.log"), "utf8")),
      { args, env: '中文 value = "x"' },
    );
  },
);

test(
  "Windows launch fails closed for invalid executable, cwd and log; later launches still work",
  windows,
  async (t) => {
    const f = await fixture(t);
    const base = {
      file: process.execPath,
      args: ["-e", "process.exit(0)"],
      cwd: f.root,
      log: path.join(f.root, "failure.log"),
    };
    for (const override of [
      { file: path.join(f.root, "absent.exe") },
      { cwd: path.join(f.root, "absent") },
      { log: path.join(f.root, "absent/log") },
    ])
      assert.throws(
        () => startProcess({ ...base, ...override }),
        /web_job_launch_failed/,
      );
    for (let attempt = 0; attempt < 8; attempt++) {
      const owned = f.start(["-e", "setInterval(()=>{},1000)"]);
      await stopProcess(owned);
      assert.deepEqual(owned.windowsJob?.refresh(), { active: 0, code: 1 });
    }
  },
);

test(
  "Windows native API refuses closing a live Job and foreign handles",
  windows,
  async (t) => {
    const f = await fixture(t);
    const api = loadWindowsJob();
    assert.throws(() => api.terminate({ pid: 1 }), /invalid Job/);
    const job = api.launch(
      process.execPath,
      windowsCommand(process.execPath, ["-e", "setInterval(()=>{},1000)"]),
      f.root,
      path.join(f.root, "native.log"),
      windowsEnvironment(process.env),
    );
    try {
      assert.throws(() => api.close(job), /close_active/);
      assert.equal(api.poll(job).active, 1);
    } finally {
      api.terminate(job);
      await until(
        async () => api.poll(job),
        (state) => state.active === 0 && state.code !== null,
      );
      api.close(job);
    }
  },
);

test(
  "Windows refuses startup when its native binary is missing",
  windows,
  async (t) => {
    const f = await fixture(t);
    const script = path.join(f.root, "missing.mjs");
    const marker = path.join(f.root, "must-not-exist");
    await fs.writeFile(
      script,
      `
    import assert from 'node:assert/strict';
    import {startProcess} from ${JSON.stringify(new URL("../src/case/web/process.js", import.meta.url).href)};
    Object.defineProperty(process, 'arch', {value:'unsupported-test-arch'});
    assert.throws(() => startProcess(${JSON.stringify({ file: process.execPath, args: ["-e", `require('node:fs').writeFileSync(${JSON.stringify(marker)},'started')`], cwd: f.root, log: path.join(f.root, "missing.log") })}), /web_job_binary_missing/);
  `,
    );
    const child = spawn(
      process.execPath,
      [...process.execArgv.filter((arg) => arg !== "--test"), script],
      { cwd: process.cwd(), windowsHide: true, stdio: "pipe" },
    );
    let output = "";
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    const [code] = await once(child, "exit");
    assert.equal(code, 0, output);
    await assert.rejects(fs.access(marker));
  },
);

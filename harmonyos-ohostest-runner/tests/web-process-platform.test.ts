import assert from "node:assert/strict";
import childProcess, { type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { createRequire, syncBuiltinESMExports } from "node:module";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import test from "node:test";
import { startProcess, stopProcess } from "../src/case/web/process.js";
import { waitForPortRelease } from "../src/case/web/readiness.js";
import {
  windowsCommand,
  windowsEnvironment,
} from "../src/case/web/windowsJob.js";

for (const platform of ["darwin", "linux"]) {
  test(`${platform} preserves detached spawn and SIGTERM/SIGKILL group cleanup without loading native code`, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "web-platform-"));
    const originalPlatform = Object.getOwnPropertyDescriptor(
      process,
      "platform",
    )!;
    const originalSpawn = childProcess.spawn;
    const originalKill = process.kill;
    const calls: { pid: number; signal: unknown }[] = [];
    const child = Object.assign(new EventEmitter(), {
      pid: 123456789,
      exitCode: null,
      signalCode: null,
    });
    let spawned = false;
    try {
      Object.defineProperty(process, "platform", { value: platform });
      childProcess.spawn = ((file, args, options) => {
        assert.equal(file, "fixture-only");
        assert.deepEqual(args, ["argument"]);
        assert.equal(options?.detached, true);
        assert.equal(options?.cwd, root);
        spawned = true;
        return child as unknown as ChildProcess;
      }) as typeof childProcess.spawn;
      process.kill = (pid, signal) => {
        calls.push({ pid, signal });
        if (signal === "SIGKILL") child.emit("close", null, signal);
        return true;
      };
      syncBuiltinESMExports();
      const owned = startProcess({
        file: "fixture-only",
        args: ["argument"],
        cwd: root,
        log: path.join(root, "out.log"),
      });
      assert.ok(spawned);
      assert.equal(owned.windowsJob, undefined);
      await stopProcess(owned);
      assert.deepEqual(calls, [
        { pid: -123456789, signal: "SIGTERM" },
        { pid: -123456789, signal: "SIGKILL" },
      ]);
      assert.ok(
        !Object.keys(createRequire(import.meta.url).cache).some((key) =>
          key.endsWith("web-job.node"),
        ),
      );
      // POSIX keeps its existing failed-stop promise semantics as well.
      process.kill = () => {
        throw new Error("fixture signal denied");
      };
      const failing = startProcess({
        file: "fixture-only",
        args: ["argument"],
        cwd: root,
        log: path.join(root, "failed.log"),
      });
      const failure = stopProcess(failing);
      await assert.rejects(failure, /fixture signal denied/);
      assert.equal(stopProcess(failing), failure);
    } finally {
      Object.defineProperty(process, "platform", originalPlatform);
      childProcess.spawn = originalSpawn;
      process.kill = originalKill;
      syncBuiltinESMExports();
      await fs.rm(root, { recursive: true, force: true });
    }
  });
}

test("Port release verification reports a remaining listener without terminating it", async () => {
  const listener = net.createServer();
  await new Promise<void>((resolve) =>
    listener.listen(0, "127.0.0.1", resolve),
  );
  const port = (listener.address() as net.AddressInfo).port;
  try {
    await assert.rejects(
      waitForPortRelease(`http://127.0.0.1:${port}`),
      /web_port_not_released/,
    );
    assert.ok(listener.listening);
  } finally {
    await new Promise<void>((resolve, reject) =>
      listener.close((error) => (error ? reject(error) : resolve())),
    );
  }
  await waitForPortRelease(`http://127.0.0.1:${port}`);
});

test("Windows environment encoding keeps deterministic case-insensitive keys and rejects NUL injection", () => {
  assert.equal(
    windowsEnvironment({
      path: "second",
      Path: "first",
      A: "值",
      Z: undefined,
    }).toString("utf16le"),
    "A=值\0Path=first\0\0",
  );
  assert.equal(windowsEnvironment({}).toString("utf16le"), "\0\0");
  assert.throws(
    () => windowsEnvironment({ A: "a\0B=b" }),
    /invalid_environment/,
  );
  assert.throws(
    () => windowsEnvironment({ "A=B": "c" }),
    /invalid_environment/,
  );
  assert.throws(() => windowsCommand("node", ["a\0b"]), /argument_nul/);
});

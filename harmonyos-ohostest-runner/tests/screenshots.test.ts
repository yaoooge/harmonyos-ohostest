import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DeviceScreenCapture } from "../src/execution/screenshots.js";
import { shellQuote } from "../src/execution/utils/shellQuote.js";
import type { CommandResult } from "../src/execution/types/index.js";

interface CaptureHarness {
  commands: string[];
  captured: string[];
  localDir: string;
  outDir: string;
  /** When set, fails every command containing the given fragment. */
  failFragment?: string;
  /** Optional gate held shut to keep a `file recv` in flight. */
  recvGate?: Promise<void>;
  run: (command: string) => Promise<CommandResult>;
}

async function makeHarness(
  configure: (harness: CaptureHarness) => void = () => undefined,
): Promise<CaptureHarness> {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "shots-out-"));
  const localDir = path.join(outDir, "screenshots", "phone");
  const harness: CaptureHarness = {
    commands: [],
    captured: [],
    localDir,
    outDir,
    run: async () => ({ stdout: "", stderr: "", exitCode: 0, durationMs: 1 }),
  };
  configure(harness);
  harness.run = async (command) => {
    harness.commands.push(command);
    if (harness.failFragment && command.includes(harness.failFragment)) {
      return { stdout: "", stderr: "boom", exitCode: 1, durationMs: 1 };
    }
    if (command.includes(" file recv ")) {
      if (harness.recvGate) await harness.recvGate;
      // Remote side of `file recv` never contains spaces; local path is quoted.
      const rest = command.slice(command.indexOf(" file recv ") + 11);
      const local = rest
        .slice(rest.indexOf(" ") + 1)
        .replace(/^["']|["']$/g, "");
      await fs.writeFile(local, "jpeg-bytes");
    }
    return { stdout: "", stderr: "", exitCode: 0, durationMs: 1 };
  };
  return harness;
}

function makeCapture(harness: CaptureHarness, attempt = 1): DeviceScreenCapture {
  return new DeviceScreenCapture({
    hdc: "hdc -t 127.0.0.1:15001",
    localDir: harness.localDir,
    outDir: harness.outDir,
    prefix: "SmPassToPassTest-1",
    attempt,
    run: harness.run,
    onCapture: (shot) => harness.captured.push(shot),
  });
}

function failureOf(name: string, code = -2): string[] {
  return [
    "OHOS_REPORT_STATUS: class=SmPassToPassTest",
    `OHOS_REPORT_STATUS: test=${name}`,
    `OHOS_REPORT_STATUS_CODE: ${code}`,
    "OHOS_REPORT_STATUS: consuming=239",
  ];
}

async function waitFor(condition: () => boolean) {
  for (let i = 0; i < 200 && !condition(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test("a reported failure promotes the rolling frame to the failed test name", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  await waitFor(
    () => harness.commands.some((c) => c.includes("snapshot_display")),
  );
  for (const line of failureOf("should_fifty_fifty_columns_on_lg")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length > 0);
  await capture.finish();

  assert.deepEqual(harness.captured, [
    storedShot("should_fifty_fifty_columns_on_lg.jpeg"),
  ]);
  assert.equal(
    (await fs.readdir(harness.localDir)).length,
    1,
    "only the promoted frame remains",
  );
  assert.ok(
    !harness.captured[0]!.includes("pending"),
    "the pending frame is renamed, not kept",
  );
  const snapshotCount = harness.commands.filter((c) =>
    c.includes("snapshot_display"),
  ).length;
  assert.equal(snapshotCount, 1, "the loop stops after the failure");
  const saved = await fs.readFile(
    path.join(harness.localDir, "should_fifty_fifty_columns_on_lg.jpeg"),
  );
  assert.equal(saved.toString(), "jpeg-bytes");
});

test("runs without failures delete the pending frame", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  await waitFor(
    () => harness.commands.some((c) => c.includes("snapshot_display")),
  );
  await capture.finish();

  assert.deepEqual(harness.captured, []);
  assert.deepEqual(
    await fs.readdir(harness.localDir),
    [],
    "no screenshot survives a run without failures",
  );
  assert.ok(
    harness.commands.filter(
      (c) => c.includes("shell rm") && c.includes("pending"),
    ).length >= 1,
    "the pending remote file is cleaned up",
  );
});

test("passing, ignored and running codes never trigger the promotion", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  await waitFor(
    () => harness.commands.some((c) => c.includes("snapshot_display")),
  );
  for (const code of [0, -3, 1]) {
    for (const line of failureOf(`should_case_${code}`, code)) {
      capture.onTestOutputLine(line);
    }
  }
  await capture.finish();

  assert.deepEqual(harness.captured, []);
});

test("a failure before any frame falls back to one late shot", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  // No rolling frame yet: report the failure immediately.
  for (const line of failureOf("should_fail_md")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length > 0);
  await capture.finish();

  assert.deepEqual(harness.captured, [storedShot("should_fail_md.jpeg")]);
  assert.equal(
    harness.commands.filter((c) => c.includes("snapshot_display")).length,
    1,
  );
});

test("only the first failure promotes; later failures are ignored", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  await waitFor(
    () => harness.commands.some((c) => c.includes("snapshot_display")),
  );
  for (const line of failureOf("should_fail_md")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length > 0);
  for (const line of failureOf("should_fail_lg")) {
    capture.onTestOutputLine(line);
  }
  await capture.finish();

  assert.deepEqual(harness.captured, [storedShot("should_fail_md.jpeg")]);
});

test("sanitizes and suffixes retry attempts in the promoted name", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness, 2);

  capture.startDuringLoop(5);
  await waitFor(
    () => harness.commands.some((c) => c.includes("snapshot_display")),
  );
  for (const line of failureOf("should/a b:c")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length > 0);
  await capture.finish();

  assert.deepEqual(harness.captured, [storedShot("should_a_b_c-2.jpeg")]);
});

test("stays silent when snapshot_display fails", async () => {
  const harness = await makeHarness((h) => {
    h.failFragment = "snapshot_display";
  });
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  await waitFor(
    () => harness.commands.some((c) => c.includes("snapshot_display")),
  );
  for (const line of failureOf("should_fail_md")) {
    capture.onTestOutputLine(line);
  }
  await capture.finish();

  assert.deepEqual(harness.captured, []);
  assert.deepEqual(
    harness.commands.filter((command) => command.includes("file recv")),
    [],
  );
});

test("finish waits for the in-flight promotion before resolving", async () => {
  let releaseRecv: (() => void) | undefined;
  const harness = await makeHarness((h) => {
    h.recvGate = new Promise<void>((resolve) => {
      releaseRecv = resolve;
    });
  });
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  await waitFor(() =>
    harness.commands.some((c) => c.includes(" file recv ")),
  );
  for (const line of failureOf("should_fail_md")) {
    capture.onTestOutputLine(line);
  }
  const finishing = capture.finish();
  let settled = false;
  void finishing.then(() => {
    settled = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(settled, false, "finish must wait for the pending recv");
  releaseRecv?.();
  await finishing;

  assert.deepEqual(harness.captured, [storedShot("should_fail_md.jpeg")]);
});

function storedShot(name: string): string {
  return path.join("screenshots", "phone", name);
}

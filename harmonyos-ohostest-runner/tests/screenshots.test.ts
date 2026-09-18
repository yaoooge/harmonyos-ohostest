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
    prefix: "CommonTest-1",
    attempt,
    run: harness.run,
    onCapture: (shot) => harness.captured.push(shot),
  });
}

function startOf(name: string): string[] {
  return [
    "OHOS_REPORT_STATUS: class=CommonTest",
    `OHOS_REPORT_STATUS: test=${name}`,
    "OHOS_REPORT_STATUS_CODE: 1",
  ];
}

function failureOf(name: string, code = -2): string[] {
  return [
    "OHOS_REPORT_STATUS: class=CommonTest",
    `OHOS_REPORT_STATUS: test=${name}`,
    `OHOS_REPORT_STATUS_CODE: ${code}`,
    "OHOS_REPORT_STATUS: consuming=239",
  ];
}

function snapshotCount(harness: CaptureHarness): number {
  return harness.commands.filter((c) => c.includes("snapshot_display")).length;
}

async function waitFor(condition: () => boolean) {
  for (let i = 0; i < 200 && !condition(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function waitForSnapshot(harness: CaptureHarness, minCount: number) {
  for (let i = 0; i < 200 && snapshotCount(harness) < minCount; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test("a rolling frame captured during the failing case is promoted", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  for (const line of startOf("should_fail_case")) {
    capture.onTestOutputLine(line);
  }
  await waitForSnapshot(harness, 1);
  for (const line of failureOf("should_fail_case")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length > 0);
  await capture.finish();

  assert.deepEqual(harness.captured, [storedShot("should_fail_case.jpeg")]);
  assert.equal(
    (await fs.readdir(harness.localDir)).length,
    1,
    "promoted frame only, no pending leftovers",
  );
});

test("a stale startup frame is never promoted; the failure is shot fresh", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  // Rolling frame taken BEFORE the case started (app startup scene).
  capture.startDuringLoop(5);
  await waitForSnapshot(harness, 1);
  // The case starts, invalidating the startup frame, and fails quickly.
  for (const line of startOf("should_fast_fail")) {
    capture.onTestOutputLine(line);
  }
  for (const line of failureOf("should_fast_fail")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length > 0);
  await capture.finish();

  assert.deepEqual(harness.captured, [storedShot("should_fast_fail.jpeg")]);
  // At least: one rolling snapshot + one fresh shot for the failure itself;
  // the rolling loop keeps running for further cases.
  assert.ok(snapshotCount(harness) >= 2);
  assert.equal(
    (await fs.readdir(harness.localDir)).length,
    1,
    "only the fresh shot remains",
  );
});

test("each failing case gets its own fresh frame; passing ones get none", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  for (const line of startOf("should_pass_one")) {
    capture.onTestOutputLine(line);
  }
  for (const line of failureOf("should_pass_one", 0).slice(1)) {
    capture.onTestOutputLine(line);
  }
  for (const line of startOf("should_fail_two")) {
    capture.onTestOutputLine(line);
  }
  await waitForSnapshot(harness, 1);
  for (const line of failureOf("should_fail_two")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length >= 1);
  for (const line of startOf("should_fail_three")) {
    capture.onTestOutputLine(line);
  }
  await waitForSnapshot(harness, 2);
  for (const line of failureOf("should_fail_three")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length >= 2);
  await capture.finish();

  assert.deepEqual(harness.captured, [
    storedShot("should_fail_two.jpeg"),
    storedShot("should_fail_three.jpeg"),
  ]);
});

test("a failure before any frame gets an immediate shot", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  for (const line of startOf("should_fail_md")) {
    capture.onTestOutputLine(line);
  }
  for (const line of failureOf("should_fail_md")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length > 0);
  await capture.finish();

  assert.deepEqual(harness.captured, [storedShot("should_fail_md.jpeg")]);
});

test("a failing case reporting twice is only shot once", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  for (const line of startOf("should_fail_once")) {
    capture.onTestOutputLine(line);
  }
  for (const line of failureOf("should_fail_once")) {
    capture.onTestOutputLine(line);
  }
  await waitFor(() => harness.captured.length > 0);
  for (const line of failureOf("should_fail_once")) {
    capture.onTestOutputLine(line);
  }
  await capture.finish();

  assert.deepEqual(harness.captured, [storedShot("should_fail_once.jpeg")]);
});

test("a passed case never claims the leftover pending frame at finish", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  await waitForSnapshot(harness, 1);
  for (const line of startOf("should_passed_case")) {
    capture.onTestOutputLine(line);
  }
  for (const line of failureOf("should_passed_case", 0).slice(1)) {
    capture.onTestOutputLine(line);
  }
  await capture.finish();

  assert.deepEqual(
    harness.captured,
    [],
    "a passing case must not receive a frame",
  );
  assert.deepEqual(
    await fs.readdir(harness.localDir),
    [],
    "the leftover pending frame is deleted",
  );
});

test("a leftover pending frame at finish belongs to the case that never reported", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  for (const line of startOf("should_hanging_case")) {
    capture.onTestOutputLine(line);
  }
  await waitForSnapshot(harness, 1);
  // The command ends before the case reports (hang or timeout).
  await capture.finish();

  assert.deepEqual(harness.captured, [storedShot("should_hanging_case.jpeg")]);
});

test("runs without any reported case leave nothing behind", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness);

  capture.startDuringLoop(5);
  await waitForSnapshot(harness, 1);
  await capture.finish();

  assert.deepEqual(harness.captured, []);
  assert.deepEqual(
    await fs.readdir(harness.localDir),
    [],
    "no pending frame survives a run without reported cases",
  );
  assert.ok(
    harness.commands.filter(
      (c) => c.includes("shell rm") && c.includes("pending"),
    ).length >= 1,
  );
});

test("sanitizes and suffixes retry attempts in the file name", async () => {
  const harness = await makeHarness();
  const capture = makeCapture(harness, 2);

  capture.startDuringLoop(5);
  await waitForSnapshot(harness, 1);
  for (const line of startOf("should/a b:c")) {
    capture.onTestOutputLine(line);
  }
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
  await waitForSnapshot(harness, 1);
  for (const line of startOf("should_fail_md")) {
    capture.onTestOutputLine(line);
  }
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

test("finish waits for the in-flight recv before resolving", async () => {
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
  for (const line of startOf("should_slow_fail")) {
    capture.onTestOutputLine(line);
  }
  for (const line of failureOf("should_slow_fail")) {
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

  assert.deepEqual(harness.captured, [storedShot("should_slow_fail.jpeg")]);
});

function storedShot(name: string): string {
  return path.join("screenshots", "phone", name);
}

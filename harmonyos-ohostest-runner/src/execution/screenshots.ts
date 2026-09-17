import fs from "node:fs/promises";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import type { CommandResult } from "./types/index.js";
import { shellQuote } from "./utils/shellQuote.js";
import { sleep } from "./utils/sleep.js";

const remoteShotDir = "/data/local/tmp";

/** Cadence of the rolling capture that tracks the screen during the run. */
export const screenshotIntervalMs = 3000;

export interface ScreenCaptureInput {
  /** Quoted `hdc -t <target>` prefix built by hdcFor(). */
  hdc: string;
  /** Absolute directory receiving the captured file. */
  localDir: string;
  /** Absolute run output directory used to compute stored relative paths. */
  outDir: string;
  /** Stem for the rolling pending file, e.g. `SmPassToPassTest-1`. */
  prefix: string;
  /** Unlock-retry attempt index (>=2 gets a name suffix to avoid overwrites). */
  attempt: number;
  run: (command: string) => Promise<CommandResult>;
  onCapture?: (relativePath: string) => void;
}

/**
 * Keeps one screenshot per failing test case. While the test command runs, a
 * rolling capture overwrites a single pending frame every few seconds; the
 * UiTest-driven app stays on screen during this phase, so the latest frame
 * shows the current scene. When the live stream reports a failing test case,
 * the loop stops and the pending frame - taken before the teardown closed the
 * app - is renamed after that test case. Runs without failures delete the
 * pending frame, and a suite that failed before any frame was taken falls
 * back to one late, best-effort shot. Snapshot failures never interrupt the
 * surrounding test flow.
 */
export class DeviceScreenCapture {
  private readonly input: ScreenCaptureInput;
  private readonly pendingLocal: string;
  private readonly pendingRemote: string;
  private lastTestCase: string | undefined;
  private failedName: string | undefined;
  private stopped = false;
  private hasPendingFrame = false;
  private loop: Promise<void> | undefined;
  private finalizer: Promise<void> | undefined;
  private interruptWait: (() => void) | undefined;

  constructor(input: ScreenCaptureInput) {
    this.input = input;
    this.pendingLocal = path.join(
      input.localDir,
      `${input.prefix}-pending.jpeg`,
    );
    this.pendingRemote = `${remoteShotDir}/${input.prefix}-pending.jpeg`;
  }

  /** Feed one stdout line of the live aa test stream. */
  onTestOutputLine(line: string): void {
    const clean = stripVTControlCharacters(line).trim();
    const name = /^OHOS_REPORT_STATUS: test=(.+)$/.exec(clean)?.[1]?.trim();
    if (name) {
      this.lastTestCase = name;
      return;
    }
    if (this.failedName || !this.lastTestCase || this.stopped) return;
    const code = /^OHOS_REPORT_STATUS_CODE:\s*(-?\d+)$/.exec(clean)?.[1];
    if (code === undefined) return;
    // STATUS_CODE: 1 running, 0 passed, -3 ignored; anything else failed.
    const value = Number(code);
    if (value === 1 || value === 0 || value === -3) return;
    this.failedName = this.lastTestCase;
    this.stopped = true;
    this.interruptWait?.();
    this.finalizer = this.keepFailureShot(this.failedName);
  }

  /** Starts the rolling capture tracking the screen during the run. */
  startDuringLoop(intervalMs: number = screenshotIntervalMs): void {
    if (this.loop) return;
    this.loop = this.runRollingLoop(intervalMs);
  }

  /** Settles the rolling capture; passing runs leave nothing behind. */
  async finish(): Promise<void> {
    this.stopped = true;
    this.interruptWait?.();
    await this.loop?.catch(() => undefined);
    this.loop = undefined;
    await this.finalizer?.catch(() => undefined);
    this.finalizer = undefined;
    if (!this.failedName) {
      await fs.rm(this.pendingLocal, { force: true }).catch(() => undefined);
      await this.input
        .run(`${this.input.hdc} shell rm ${this.pendingRemote}`)
        .catch(() => undefined);
    }
  }

  private async runRollingLoop(intervalMs: number): Promise<void> {
    while (!this.stopped) {
      await this.wait(intervalMs);
      if (this.stopped) return;
      const saved = await this.captureTo(
        this.pendingLocal,
        this.pendingRemote,
      );
      this.hasPendingFrame = this.hasPendingFrame || saved;
    }
  }

  private async keepFailureShot(failedTestCase: string): Promise<void> {
    await this.loop?.catch(() => undefined);
    this.loop = undefined;
    const stem = `${safeFileName(failedTestCase)}${
      this.input.attempt > 1 ? `-${this.input.attempt}` : ""
    }`;
    const finalLocal = path.join(this.input.localDir, `${stem}.jpeg`);
    const finalRemote = `${remoteShotDir}/${stem}.jpeg`;
    if (this.hasPendingFrame) {
      // The pending frame was taken before the teardown closed the app.
      await fs.rename(this.pendingLocal, finalLocal).catch(() => undefined);
      this.input.onCapture?.(path.relative(this.input.outDir, finalLocal));
      await this.input
        .run(`${this.input.hdc} shell rm ${this.pendingRemote}`)
        .catch(() => undefined);
      return;
    }
    // The case failed before any frame was taken; late shot, best effort.
    const saved = await this.captureTo(finalLocal, finalRemote);
    if (saved) {
      this.input.onCapture?.(path.relative(this.input.outDir, finalLocal));
    }
  }

  private async captureTo(local: string, remote: string): Promise<boolean> {
    try {
      await fs.mkdir(this.input.localDir, { recursive: true });
      const shot = await this.input.run(
        `${this.input.hdc} shell snapshot_display -f ${remote}`,
      );
      if (shot.exitCode !== 0) return false;
      const recv = await this.input.run(
        `${this.input.hdc} file recv ${remote} ${shellQuote(local)}`,
      );
      // hdc may report success without producing the file; verify before keeping it.
      const saved =
        recv.exitCode === 0
          ? await fs.stat(local).catch(() => undefined)
          : undefined;
      await this.input.run(`${this.input.hdc} shell rm ${remote}`);
      return saved?.isFile() ?? false;
    } catch {
      return false;
    }
  }

  private wait(intervalMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.interruptWait = undefined;
        resolve();
      }, intervalMs);
      this.interruptWait = () => {
        clearTimeout(timer);
        this.interruptWait = undefined;
        resolve();
      };
    });
  }
}

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, "_");
}

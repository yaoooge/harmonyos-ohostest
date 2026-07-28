import { exec, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder, promisify } from "node:util";
import type { CommandExecutor, CommandResult } from "./types/index.js";

const execAsync = promisify(exec);
const utf8Decoder = new TextDecoder("utf-8");
const windowsDecoder = new TextDecoder("gb18030");

export const defaultCommandExecutor: CommandExecutor = async (command, cwd) => {
  const started = Date.now();
  try {
    const result = await execAsync(command, {
      cwd,
      maxBuffer: 1024 * 1024 * 20,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    const maybe = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
    };
    return {
      stdout: maybe.stdout ?? "",
      stderr: maybe.stderr ?? maybe.message ?? String(error),
      exitCode: typeof maybe.code === "number" ? maybe.code : 1,
      durationMs: Date.now() - started,
    };
  }
};

export async function runDetachedCommand(
  command: string,
  cwd: string,
  startupTimeoutMs = 10000,
): Promise<CommandResult> {
  const started = Date.now();
  try {
    const child = spawn(command, {
      cwd,
      detached: true,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return await waitForDetachedStartup(child, started, startupTimeoutMs);
  } catch (error) {
    return {
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      durationMs: Date.now() - started,
    };
  }
}

function waitForDetachedStartup(
  child: ChildProcess,
  started: number,
  startupTimeoutMs: number,
): Promise<CommandResult> {
  let stdout = "";
  let stderr = "";

  return new Promise<CommandResult>((resolve) => {
    let settled = false;
    const finish = (result: Omit<CommandResult, "durationMs">): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({ ...result, durationMs: Date.now() - started });
    };
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout = appendCommandOutput(stdout, chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = appendCommandOutput(stderr, chunk);
    });
    child.on("error", (error) =>
      finish({ stdout, stderr: stderr || error.message, exitCode: 1 }),
    );
    child.on("close", (code) =>
      finish({ stdout, stderr, exitCode: code ?? 0 }),
    );

    const timeout = setTimeout(() => {
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.unref();
      finish({ stdout, stderr, exitCode: 0 });
    }, startupTimeoutMs);
  });
}

function appendCommandOutput(current: string, chunk: Buffer): string {
  return `${current}${decodeCommandOutput(chunk)}`.slice(-1024 * 1024);
}

export function decodeCommandOutput(
  chunk: Buffer,
  platform: NodeJS.Platform = process.platform,
): string {
  return platform === "win32"
    ? windowsDecoder.decode(chunk)
    : utf8Decoder.decode(chunk);
}

export class CommandLogger {
  private started = false;
  private index = 0;

  constructor(
    private readonly logPath: string,
    private readonly title = "# ohosTest matrix command log\n",
  ) {}

  async record(command: string, result: CommandResult): Promise<void> {
    this.index += 1;
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    if (!this.started) {
      await fs.writeFile(this.logPath, this.title, "utf-8");
      this.started = true;
    }
    await fs.appendFile(
      this.logPath,
      [
        "",
        `## Command ${this.index}`,
        `$ ${command}`,
        `exitCode: ${result.exitCode}`,
        `durationMs: ${result.durationMs}`,
        result.stdout ? `stdout:\n${result.stdout.trimEnd()}` : "stdout:",
        result.stderr ? `stderr:\n${result.stderr.trimEnd()}` : "stderr:",
        "",
      ].join("\n"),
      "utf-8",
    );
  }
}

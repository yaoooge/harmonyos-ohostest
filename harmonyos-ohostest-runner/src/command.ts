import { exec, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { CommandExecutor, CommandResult } from "./types.js";

const execAsync = promisify(exec);

export const defaultCommandExecutor: CommandExecutor = async (command, cwd) => {
  const started = Date.now();
  try {
    const result = await execAsync(command, { cwd, maxBuffer: 1024 * 1024 * 20 });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    const maybe = error as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      stdout: maybe.stdout ?? "",
      stderr: maybe.stderr ?? maybe.message ?? String(error),
      exitCode: typeof maybe.code === "number" ? maybe.code : 1,
      durationMs: Date.now() - started,
    };
  }
};

export async function runDetachedCommand(command: string, cwd: string): Promise<CommandResult> {
  const started = Date.now();
  const child = spawn(command, {
    cwd,
    detached: true,
    shell: true,
    stdio: "ignore",
  });
  child.unref();
  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
    durationMs: Date.now() - started,
  };
}

export class CommandLogger {
  private started = false;
  private index = 0;

  constructor(private readonly logPath: string) {}

  async record(command: string, result: CommandResult): Promise<void> {
    this.index += 1;
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    if (!this.started) {
      await fs.writeFile(this.logPath, "# ohosTest matrix command log\n", "utf-8");
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

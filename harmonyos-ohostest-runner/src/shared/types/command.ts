export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export type CommandExecutor = (command: string, cwd: string) => Promise<CommandResult>;

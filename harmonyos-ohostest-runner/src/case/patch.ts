import fs from "node:fs/promises";
import path from "node:path";
import { defaultCommandExecutor } from "../shared/command.js";
import { shellQuote } from "../shared/utils/shellQuote.js";
import type { CommandExecutor } from "../shared/types/index.js";

export async function copyBaseProject(input: {
  baseProject: string;
  workProject: string;
}): Promise<void> {
  await fs.rm(input.workProject, { recursive: true, force: true });
  await fs.mkdir(path.dirname(input.workProject), { recursive: true });
  await fs.cp(input.baseProject, input.workProject, {
    recursive: true,
    filter: (source) => path.basename(source) !== ".git",
  });
}

export async function applyPatch(input: {
  project: string;
  patchFile: string;
  label: string;
  commandExecutor?: CommandExecutor;
}): Promise<void> {
  const executor = input.commandExecutor ?? defaultCommandExecutor;
  const check = await executor(
    buildGitApplyCommand({
      project: input.project,
      patchFile: input.patchFile,
      check: true,
    }),
    input.project,
  );
  if (check.exitCode !== 0) {
    throw new Error(`patch_apply_failed: ${input.label}`);
  }
  const apply = await executor(
    buildGitApplyCommand({
      project: input.project,
      patchFile: input.patchFile,
      check: false,
    }),
    input.project,
  );
  if (apply.exitCode !== 0) {
    throw new Error(`patch_apply_failed: ${input.label}`);
  }
}

export function buildGitApplyCommand(input: {
  project: string;
  patchFile: string;
  check: boolean;
  platform?: NodeJS.Platform;
}): string {
  const platform = input.platform ?? process.platform;
  const quotedPatch = shellQuote(input.patchFile, platform);
  const checkArg = input.check ? " --check" : "";
  const gitApply = `git apply --ignore-whitespace${checkArg} ${quotedPatch}`;
  const ceiling =
    platform === "win32"
      ? path.win32.dirname(input.project)
      : path.dirname(input.project);

  if (platform === "win32") {
    return `set "GIT_CEILING_DIRECTORIES=${ceiling}" && ${gitApply}`;
  }

  return `GIT_CEILING_DIRECTORIES=${shellQuote(ceiling, platform)} ${gitApply}`;
}

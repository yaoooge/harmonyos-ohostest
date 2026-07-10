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
  await copyProjectEntry(input.baseProject, input.workProject);
}

async function copyProjectEntry(
  source: string,
  destination: string,
): Promise<void> {
  if (path.basename(source) === ".git") {
    return;
  }

  const stat = await fs.lstat(source);
  if (stat.isSymbolicLink()) {
    await copyProjectTarget(await fs.realpath(source), destination);
    return;
  }

  await copyProjectTarget(source, destination);
}

async function copyProjectTarget(
  source: string,
  destination: string,
): Promise<void> {
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source);
    for (const entry of entries) {
      await copyProjectEntry(
        path.join(source, entry),
        path.join(destination, entry),
      );
    }
    return;
  }

  if (stat.isFile()) {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    return;
  }

  throw new Error(`copy_base_project_unsupported_entry: ${source}`);
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

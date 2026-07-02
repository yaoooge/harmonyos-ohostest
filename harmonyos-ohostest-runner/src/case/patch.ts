import fs from "node:fs/promises";
import path from "node:path";
import { defaultCommandExecutor } from "../shared/command.js";
import { shellQuote } from "../shared/utils/shellQuote.js";

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
}): Promise<void> {
  const quotedPatch = shellQuote(input.patchFile);
  const ceiling = shellQuote(path.dirname(input.project));
  const gitApply = `GIT_CEILING_DIRECTORIES=${ceiling} git apply`;
  const check = await defaultCommandExecutor(`${gitApply} --check ${quotedPatch}`, input.project);
  if (check.exitCode !== 0) {
    throw new Error(`patch_apply_failed: ${input.label}: ${check.stderr || check.stdout}`);
  }
  const apply = await defaultCommandExecutor(`${gitApply} ${quotedPatch}`, input.project);
  if (apply.exitCode !== 0) {
    throw new Error(`patch_apply_failed: ${input.label}: ${apply.stderr || apply.stdout}`);
  }
}

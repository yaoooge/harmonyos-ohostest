import fs from "node:fs/promises";
import path from "node:path";
import type { CommandExecutor, CommandResult, DeviceConfig, MatrixConfig } from "./types.js";
import { shellQuote } from "./ohostest.js";

const targetReadyMaxAttempts = 120;

export interface DeviceCommandContext {
  config: MatrixConfig;
  device: DeviceConfig;
  cwd: string;
  outDir: string;
  runCommand: (command: string) => Promise<CommandResult>;
}

export function buildStartEmulatorCommand(
  config: MatrixConfig,
  device: DeviceConfig,
  platform: NodeJS.Platform = process.platform,
): string {
  if (!device.profile) {
    throw new Error(`device ${device.id} has no emulator profile.`);
  }
  return [
    shellQuote(config.paths.emulatorBin, platform),
    "-start",
    shellQuote(device.profile, platform),
    "-instancePath",
    shellQuote(config.paths.emulatorDeployedDir, platform),
    ...(device.hdcPort !== undefined ? ["-hdcport", String(device.hdcPort)] : []),
  ].join(" ");
}

export function buildStopEmulatorCommand(
  config: MatrixConfig,
  device: DeviceConfig,
  platform: NodeJS.Platform = process.platform,
): string {
  if (!device.profile) {
    throw new Error(`device ${device.id} has no emulator profile.`);
  }
  return [
    shellQuote(config.paths.emulatorBin, platform),
    "-stop",
    shellQuote(device.profile, platform),
    "-instancePath",
    shellQuote(config.paths.emulatorDeployedDir, platform),
  ].join(" ");
}

export async function prepareDevice(ctx: DeviceCommandContext): Promise<void> {
  const hdc = hdcFor(ctx.config, ctx.device);
  await ensureTargetReady(ctx);
  await ctx.runCommand(`${hdc} shell power-shell wakeup`);
  await ctx.runCommand(`${hdc} shell uitest uiInput keyEvent Home`);
}

export async function installHaps(ctx: DeviceCommandContext): Promise<void> {
  const hdc = hdcFor(ctx.config, ctx.device);
  const result = await ctx.runCommand(
    `${hdc} install -r ${shellQuote(ctx.config.artifacts.appHap)} ${shellQuote(ctx.config.artifacts.testHap)}`,
  );
  if (result.exitCode !== 0) {
    throw new Error("install_failed");
  }
}

export async function ensureTargetReady(ctx: DeviceCommandContext): Promise<void> {
  for (let attempt = 0; attempt < targetReadyMaxAttempts; attempt += 1) {
    const result = await ctx.runCommand(`${shellQuote(ctx.config.paths.hdc)} list targets`);
    if (isTargetConnected(result.stdout, ctx.device.target)) {
      return;
    }
    await sleep(1000);
  }
  throw new Error("hdc_not_connected");
}

export async function writeDeviceLog(input: {
  outDir: string;
  deviceId: string;
  lines: string[];
}): Promise<string> {
  const relativePath = path.join("devices", `${sanitizeName(input.deviceId)}.log`);
  const fullPath = path.join(input.outDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, `${input.lines.join("\n")}\n`, "utf-8");
  return relativePath;
}

export function hdcFor(config: MatrixConfig, device: DeviceConfig): string {
  return `${shellQuote(config.paths.hdc)} -t ${shellQuote(device.target)}`;
}

export function isTargetConnected(output: string, target: string): boolean {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line.startsWith(target) && !/\bOffline\b/i.test(line));
}

export async function verifyFileExists(filePath: string): Promise<void> {
  await fs.access(filePath);
}

export function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]+/g, "_");
}

export async function runIfNeeded(
  commandExecutor: CommandExecutor,
  command: string,
  cwd: string,
): Promise<CommandResult> {
  return commandExecutor(command, cwd);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

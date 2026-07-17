import fs from "node:fs/promises";
import path from "node:path";
import {
  normalizeModuleSrcPath,
  selectEntryModule,
  type ProjectModuleInfo,
} from "../matrix/utils/projectDiscovery.js";
import { parseJson5ish } from "../matrix/utils/json5ish.js";

interface BuildProfile {
  modules?: ProjectModuleInfo[];
}

interface MainModuleConfig {
  module?: { deviceTypes?: unknown };
}

export async function withSweTabletCompatibility<T>(input: {
  project: string;
  enabled: boolean;
  run: () => Promise<T>;
}): Promise<T> {
  if (!input.enabled) {
    return input.run();
  }

  const modulePath = await resolveEntryMainModulePath(input.project);
  const original = await readCompatibilityFile(modulePath);
  const config = readMainModuleConfig(original, modulePath);
  const deviceTypes = readDeviceTypes(config, modulePath);
  if (deviceTypes.includes("tablet")) {
    return input.run();
  }

  config.module!.deviceTypes = [...deviceTypes, "tablet"];
  await writeTemporaryConfig(modulePath, config);
  let runError: unknown;
  try {
    return await input.run();
  } catch (error) {
    runError = error;
    throw error;
  } finally {
    await restoreOriginalConfig(modulePath, original, runError);
  }
}

async function resolveEntryMainModulePath(project: string): Promise<string> {
  const buildProfilePath = path.join(project, "build-profile.json5");
  let buildProfile: BuildProfile;
  try {
    buildProfile = parseJson5ish(
      await fs.readFile(buildProfilePath, "utf-8"),
    ) as BuildProfile;
  } catch (error) {
    throw new Error(
      `swe_tablet_compatibility_entry_module_not_found: ${buildProfilePath}: ${formatError(error)}`,
    );
  }
  if (!Array.isArray(buildProfile.modules)) {
    throw new Error(
      `swe_tablet_compatibility_entry_module_not_found: ${buildProfilePath}: modules must be an array.`,
    );
  }
  const moduleInfo = selectEntryModule(buildProfile.modules);
  const srcPath = moduleInfo.srcPath ?? moduleInfo.name;
  if (typeof srcPath !== "string" || srcPath.trim().length === 0) {
    throw new Error(
      `swe_tablet_compatibility_entry_module_not_found: ${buildProfilePath}`,
    );
  }
  return path.join(
    project,
    normalizeModuleSrcPath(srcPath),
    "src",
    "main",
    "module.json5",
  );
}

async function readCompatibilityFile(modulePath: string): Promise<string> {
  try {
    return await fs.readFile(modulePath, "utf-8");
  } catch (error) {
    throw new Error(
      `swe_tablet_compatibility_read_failed: ${modulePath}: ${formatError(error)}`,
    );
  }
}

function readMainModuleConfig(
  original: string,
  modulePath: string,
): MainModuleConfig {
  try {
    return parseJson5ish(original) as MainModuleConfig;
  } catch (error) {
    throw new Error(
      `swe_tablet_compatibility_invalid_module: ${modulePath}: ${formatError(error)}`,
    );
  }
}

function readDeviceTypes(
  config: MainModuleConfig,
  modulePath: string,
): string[] {
  const deviceTypes = config.module?.deviceTypes;
  if (
    !Array.isArray(deviceTypes) ||
    deviceTypes.some((deviceType) => typeof deviceType !== "string")
  ) {
    throw new Error(
      `swe_tablet_compatibility_invalid_module: ${modulePath}: module.deviceTypes must be a string array.`,
    );
  }
  return deviceTypes;
}

async function writeTemporaryConfig(
  modulePath: string,
  config: MainModuleConfig,
): Promise<void> {
  try {
    await fs.writeFile(
      modulePath,
      `${JSON.stringify(config, null, 2)}\n`,
      "utf-8",
    );
  } catch (error) {
    throw new Error(
      `swe_tablet_compatibility_write_failed: ${modulePath}: ${formatError(error)}`,
    );
  }
}

async function restoreOriginalConfig(
  modulePath: string,
  original: string,
  runError: unknown,
): Promise<void> {
  try {
    await fs.writeFile(modulePath, original, "utf-8");
  } catch (error) {
    const runFailure =
      runError === undefined ? "" : `; run failed: ${formatError(runError)}`;
    throw new Error(
      `swe_tablet_compatibility_restore_failed: ${modulePath}: ${formatError(error)}${runFailure}`,
    );
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

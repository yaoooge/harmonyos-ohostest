import fs from "node:fs/promises";
import path from "node:path";
import type { MatrixConfig, RawMatrixConfig } from "./types/index.js";
import { discoverProjectInfo } from "./utils/projectDiscovery.js";

export interface LoadMatrixConfigInput {
  project: string;
  machineConfigPath?: string;
  testClass?: string;
  deviceSuiteOverrides?: Record<string, string[]>;
  ignoreMachineDeviceSuites?: boolean;
}

export async function loadMatrixConfig(
  input: LoadMatrixConfigInput,
): Promise<MatrixConfig> {
  const project = path.resolve(input.project);
  const machineConfigPath = path.resolve(
    input.machineConfigPath ?? defaultMachineConfigPath(),
  );
  const raw = JSON.parse(
    await fs.readFile(machineConfigPath, "utf-8"),
  ) as RawMatrixConfig;
  const projectInfo = await discoverProjectInfo(project);
  validateRawConfig(raw);

  const paths = readToolPaths(raw.paths);
  const devices = readDevices(raw, input);
  validateFoldControl(devices, paths);

  return buildMatrixConfig({
    project,
    raw,
    projectInfo,
    paths,
    devices,
    input,
  });
}

function validateRawConfig(raw: RawMatrixConfig): void {
  if (!raw.devices || raw.devices.length === 0) {
    throw new Error("config.devices must contain at least one device.");
  }
  if (hasOwn(raw, "testFolders")) {
    throw new Error(
      "config.testFolders has been removed. Put suite class names in config.devices[].testSuites.",
    );
  }
}

function readDevices(
  raw: RawMatrixConfig,
  input: LoadMatrixConfigInput,
): MatrixConfig["devices"] {
  return (
    raw.devices?.map((device, index) => readDevice(device, index, input)) ?? []
  );
}

function readDevice(
  device: NonNullable<RawMatrixConfig["devices"]>[number],
  index: number,
  input: LoadMatrixConfigInput,
): MatrixConfig["devices"][number] {
  validateRawDevice(device, index);
  const rawTestSuites =
    input.deviceSuiteOverrides?.[device.id] ??
    (input.ignoreMachineDeviceSuites ? undefined : device.testSuites);
  const testClasses = readDeviceTestSuites(rawTestSuites, index);

  return {
    id: device.id,
    ...(device.profile ? { profile: device.profile } : {}),
    target: device.target,
    ...(device.hdcPort !== undefined
      ? { hdcPort: readHdcPort(device.hdcPort, index) }
      : {}),
    startEmulator: device.startEmulator ?? false,
    foldControl: device.foldControl ?? false,
    ...(testClasses.length > 0 ? { testClasses } : {}),
  };
}

function validateRawDevice(
  device: NonNullable<RawMatrixConfig["devices"]>[number],
  index: number,
): asserts device is NonNullable<RawMatrixConfig["devices"]>[number] & {
  id: string;
  target: string;
} {
  if (!device.id || device.id.trim().length === 0) {
    throw new Error(`config.devices[${index}].id is required.`);
  }
  if (!device.target || !isValidTarget(device.target)) {
    throw new Error(`config.devices[${index}].target is invalid.`);
  }
  if (hasOwn(device, "testFolders")) {
    throw new Error(
      `config.devices[${index}].testFolders has been renamed to testSuites.`,
    );
  }
}

function validateFoldControl(
  devices: MatrixConfig["devices"],
  paths: MatrixConfig["paths"],
): void {
  if (devices.some((device) => device.foldControl) && !paths.foldServerScript) {
    throw new Error(
      "config.paths.foldServerScript is required when any device has foldControl: true.",
    );
  }
}

function buildMatrixConfig(input: {
  project: string;
  raw: RawMatrixConfig;
  projectInfo: Awaited<ReturnType<typeof discoverProjectInfo>>;
  paths: MatrixConfig["paths"];
  devices: MatrixConfig["devices"];
  input: LoadMatrixConfigInput;
}): MatrixConfig {
  const { project, raw, projectInfo, paths, devices } = input;
  const testClass = input.input.testClass ?? raw.testClass;
  return {
    project,
    product: raw.product ?? projectInfo.product,
    module: raw.module ?? projectInfo.moduleName,
    moduleSrcPath: projectInfo.moduleSrcPath,
    bundleName: raw.bundleName ?? projectInfo.bundleName,
    testModule: raw.testModule ?? projectInfo.testModuleName,
    testRunner: raw.testRunner ?? "OpenHarmonyTestRunner",
    ...(testClass ? { testClass } : {}),
    timeoutMs: raw.timeoutMs ?? 120000,
    build: readBuildConfig(raw),
    paths: readResolvedPaths(paths),
    artifacts: readArtifactConfig(project, raw, projectInfo),
    devices,
  };
}

function readBuildConfig(raw: RawMatrixConfig): MatrixConfig["build"] {
  return {
    mode: raw.build?.mode ?? "project",
    appTask: raw.build?.appTask ?? "assembleApp",
    testTask: raw.build?.testTask ?? "ohosTest@PackageHap",
  };
}

function readResolvedPaths(
  paths: MatrixConfig["paths"],
): MatrixConfig["paths"] {
  return {
    hvigorw: paths.hvigorw,
    ohpm: paths.ohpm,
    hdc: paths.hdc,
    emulatorBin: paths.emulatorBin,
    emulatorDeployedDir: paths.emulatorDeployedDir,
    ...(paths.foldServerScript
      ? { foldServerScript: paths.foldServerScript }
      : {}),
  };
}

function readArtifactConfig(
  project: string,
  raw: RawMatrixConfig,
  projectInfo: Awaited<ReturnType<typeof discoverProjectInfo>>,
): MatrixConfig["artifacts"] {
  return {
    appHap: resolveProjectPath(
      project,
      raw.artifacts?.appHap ?? projectInfo.appHap,
    ),
    testHap: resolveProjectPath(
      project,
      raw.artifacts?.testHap ?? projectInfo.testHap,
    ),
  };
}

function readToolPaths(
  rawPaths: RawMatrixConfig["paths"],
): MatrixConfig["paths"] {
  return {
    hvigorw: readRequiredConfigString(
      rawPaths?.hvigorw,
      "config.paths.hvigorw",
    ),
    ohpm: rawPaths?.ohpm?.trim() || "ohpm",
    hdc: readRequiredConfigString(rawPaths?.hdc, "config.paths.hdc"),
    emulatorBin: readRequiredConfigString(
      rawPaths?.emulatorBin,
      "config.paths.emulatorBin",
    ),
    emulatorDeployedDir: readRequiredConfigString(
      rawPaths?.emulatorDeployedDir,
      "config.paths.emulatorDeployedDir",
    ),
    ...(rawPaths?.foldServerScript?.trim()
      ? { foldServerScript: rawPaths.foldServerScript.trim() }
      : {}),
  };
}

function readRequiredConfigString(
  value: string | undefined,
  configKey: string,
): string {
  const resolved = value?.trim() ?? "";
  if (resolved.length === 0) {
    throw new Error(`${configKey} is required.`);
  }
  return resolved;
}

function readDeviceTestSuites(value: unknown, deviceIndex: number): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(
      `config.devices[${deviceIndex}].testSuites must be an array.`,
    );
  }
  const classes: string[] = [];
  const seen = new Set<string>();
  for (const suiteClass of value) {
    if (typeof suiteClass !== "string" || suiteClass.trim().length === 0) {
      throw new Error(
        `config.devices[${deviceIndex}].testSuites must contain non-empty suite class strings.`,
      );
    }
    const trimmedSuiteClass = suiteClass.trim();
    if (!seen.has(trimmedSuiteClass)) {
      classes.push(trimmedSuiteClass);
      seen.add(trimmedSuiteClass);
    }
  }
  return classes;
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function defaultMachineConfigPath(): string {
  return path.resolve("config", "machine.json");
}

function resolveProjectPath(project: string, value: string): string {
  return path.isAbsolute(value) ? value : path.join(project, value);
}

function isValidTarget(value: string): boolean {
  return /^[A-Za-z0-9_.:-]+$/.test(value) && value.includes(":");
}

function readHdcPort(value: number, index: number): number {
  if (!Number.isInteger(value) || value < 10000 || value > 16555) {
    throw new Error(`config.devices[${index}].hdcPort is invalid.`);
  }
  return value;
}

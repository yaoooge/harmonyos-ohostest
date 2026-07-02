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

  if (!raw.devices || raw.devices.length === 0) {
    throw new Error("config.devices must contain at least one device.");
  }
  if (hasOwn(raw, "testFolders")) {
    throw new Error(
      "config.testFolders has been removed. Put suite class names in config.devices[].testSuites.",
    );
  }
  const paths = readToolPaths(raw.paths);

  const devices = raw.devices.map((device, index) => {
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
  });

  const hasFoldControl = devices.some((d) => d.foldControl);
  if (hasFoldControl && !paths.foldServerScript) {
    throw new Error(
      "config.paths.foldServerScript is required when any device has foldControl: true.",
    );
  }

  return {
    project,
    product: raw.product ?? projectInfo.product,
    module: raw.module ?? projectInfo.moduleName,
    moduleSrcPath: projectInfo.moduleSrcPath,
    bundleName: raw.bundleName ?? projectInfo.bundleName,
    testModule: raw.testModule ?? projectInfo.testModuleName,
    testRunner: raw.testRunner ?? "OpenHarmonyTestRunner",
    ...((input.testClass ?? raw.testClass)
      ? { testClass: input.testClass ?? raw.testClass }
      : {}),
    timeoutMs: raw.timeoutMs ?? 120000,
    build: {
      mode: raw.build?.mode ?? "project",
      appTask: raw.build?.appTask ?? "assembleApp",
      testTask: raw.build?.testTask ?? "ohosTest@PackageHap",
    },
    paths: {
      hvigorw: paths.hvigorw,
      ohpm: paths.ohpm,
      hdc: paths.hdc,
      emulatorBin: paths.emulatorBin,
      emulatorDeployedDir: paths.emulatorDeployedDir,
      ...(paths.foldServerScript
        ? { foldServerScript: paths.foldServerScript }
        : {}),
    },
    artifacts: {
      appHap: resolveProjectPath(
        project,
        raw.artifacts?.appHap ?? projectInfo.appHap,
      ),
      testHap: resolveProjectPath(
        project,
        raw.artifacts?.testHap ?? projectInfo.testHap,
      ),
    },
    devices,
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

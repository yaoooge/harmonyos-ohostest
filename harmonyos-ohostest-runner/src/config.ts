import fs from "node:fs/promises";
import path from "node:path";
import type { MatrixConfig, RawMatrixConfig } from "./types.js";

export interface LoadMatrixConfigInput {
  project: string;
  machineConfigPath?: string;
  testClass?: string;
}

const defaultHdc =
  "/Users/guoyutong/command-line-tools/sdk/default/openharmony/toolchains/hdc";
const defaultEmulatorBin = "/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator";
const defaultEmulatorDeployedDir = "/Users/guoyutong/.Huawei/Emulator/deployed";

export async function loadMatrixConfig(input: LoadMatrixConfigInput): Promise<MatrixConfig> {
  const project = path.resolve(input.project);
  const machineConfigPath = path.resolve(input.machineConfigPath ?? defaultMachineConfigPath());
  const raw = JSON.parse(await fs.readFile(machineConfigPath, "utf-8")) as RawMatrixConfig;
  const projectInfo = await discoverProjectInfo(project);

  if (!raw.devices || raw.devices.length === 0) {
    throw new Error("config.devices must contain at least one device.");
  }
  if (!raw.paths?.hvigorw || raw.paths.hvigorw.trim().length === 0) {
    throw new Error("config.paths.hvigorw is required.");
  }

  const devices = raw.devices.map((device, index) => {
    if (!device.id || device.id.trim().length === 0) {
      throw new Error(`config.devices[${index}].id is required.`);
    }
    if (!device.target || !isValidTarget(device.target)) {
      throw new Error(`config.devices[${index}].target is invalid.`);
    }
    return {
      id: device.id,
      ...(device.profile ? { profile: device.profile } : {}),
      target: device.target,
      ...(device.hdcPort !== undefined ? { hdcPort: readHdcPort(device.hdcPort, index) } : {}),
      startEmulator: device.startEmulator ?? false,
    };
  });

  return {
    project,
    product: raw.product ?? projectInfo.product,
    module: raw.module ?? projectInfo.moduleName,
    bundleName: raw.bundleName ?? projectInfo.bundleName,
    testModule: raw.testModule ?? projectInfo.testModuleName,
    testRunner: raw.testRunner ?? "OpenHarmonyTestRunner",
    ...(input.testClass ?? raw.testClass ? { testClass: input.testClass ?? raw.testClass } : {}),
    timeoutMs: raw.timeoutMs ?? 120000,
    build: {
      mode: raw.build?.mode ?? "project",
      appTask: raw.build?.appTask ?? "assembleApp",
      testTask: raw.build?.testTask ?? "ohosTest@PackageHap",
    },
    paths: {
      hvigorw: raw.paths.hvigorw,
      hdc: raw.paths?.hdc ?? defaultHdc,
      emulatorBin: raw.paths?.emulatorBin ?? defaultEmulatorBin,
      emulatorDeployedDir: raw.paths?.emulatorDeployedDir ?? defaultEmulatorDeployedDir,
    },
    artifacts: {
      appHap: resolveProjectPath(
        project,
        raw.artifacts?.appHap ?? projectInfo.appHap,
      ),
      testHap: resolveProjectPath(project, raw.artifacts?.testHap ?? projectInfo.testHap),
    },
    devices,
  };
}

interface ProjectInfo {
  product: string;
  moduleName: string;
  moduleSrcPath: string;
  bundleName: string;
  testModuleName: string;
  appHap: string;
  testHap: string;
}

async function discoverProjectInfo(project: string): Promise<ProjectInfo> {
  const buildProfile = parseJson5ish(await fs.readFile(path.join(project, "build-profile.json5"), "utf-8")) as {
    app?: { products?: Array<{ name?: string }> };
    modules?: Array<{ name?: string; srcPath?: string }>;
  };
  const appJson = parseJson5ish(await fs.readFile(path.join(project, "AppScope", "app.json5"), "utf-8")) as {
    app?: { bundleName?: string };
  };
  const product = buildProfile.app?.products?.[0]?.name ?? "default";
  const moduleInfo = pickEntryModule(buildProfile.modules ?? []);
  const moduleName = moduleInfo.name ?? "entry";
  const moduleSrcPath = stripLeadingDotSlash(moduleInfo.srcPath ?? moduleName);
  const ohosTestModulePath = path.join(project, moduleSrcPath, "src", "ohosTest", "module.json5");
  const ohosTestModule = parseJson5ish(await fs.readFile(ohosTestModulePath, "utf-8")) as {
    module?: { name?: string };
  };
  const bundleName = appJson.app?.bundleName;
  if (!bundleName) {
    throw new Error("project AppScope/app.json5 app.bundleName is required.");
  }

  return {
    product,
    moduleName,
    moduleSrcPath,
    bundleName,
    testModuleName: ohosTestModule.module?.name ?? `${moduleName}_test`,
    appHap: path.join(
      moduleSrcPath,
      "build",
      product,
      "outputs",
      product,
      `${moduleName}-${product}-unsigned.hap`,
    ),
    testHap: path.join(
      moduleSrcPath,
      "build",
      product,
      "outputs",
      "ohosTest",
      `${moduleName}-ohosTest-unsigned.hap`,
    ),
  };
}

function pickEntryModule(modules: Array<{ name?: string; srcPath?: string }>): { name?: string; srcPath?: string } {
  return (
    modules.find((item) => item.name === "entry") ??
    modules.find((item) => item.srcPath?.includes("entry")) ??
    modules[0] ??
    {}
  );
}

function stripLeadingDotSlash(value: string): string {
  return value.replace(/^\.\//, "");
}

function parseJson5ish(text: string): unknown {
  const withoutBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/(^|[^:])\/\/.*$/gm, "$1");
  return JSON.parse(withoutLineComments);
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

import fs from "node:fs/promises";
import path from "node:path";
import type { SharedModuleInfo } from "../types/index.js";
import { parseJson5ish } from "./json5ish.js";

export interface ProjectInfo {
  product: string;
  moduleName: string;
  moduleSrcPath: string;
  bundleName: string;
  testModuleName: string;
  appHap: string;
  testHap: string;
  sharedModules: SharedModuleInfo[];
}

export interface ProjectModuleInfo {
  name?: string;
  srcPath?: string;
  targets?: Array<{
    name?: string;
    applyToProducts?: string[];
  }>;
}

interface BuildProfile {
  app?: { products?: Array<{ name?: string }> };
  modules?: ProjectModuleInfo[];
}

interface AppConfig {
  app?: { bundleName?: string };
}

interface TestModuleConfig {
  module?: { name?: string };
}

interface MainModuleConfig {
  module?: { type?: string };
}

export async function discoverProjectInfo(
  project: string,
): Promise<ProjectInfo> {
  const buildProfile = await readJson5ish<BuildProfile>(
    path.join(project, "build-profile.json5"),
  );
  const appJson = await readJson5ish<AppConfig>(
    path.join(project, "AppScope", "app.json5"),
  );
  const product = buildProfile.app?.products?.[0]?.name ?? "default";
  const moduleInfo = selectEntryModule(buildProfile.modules ?? []);
  const moduleName = moduleInfo.name ?? "entry";
  const moduleSrcPath = normalizeModuleSrcPath(
    moduleInfo.srcPath ?? moduleName,
  );
  const ohosTestModulePath = path.join(
    project,
    moduleSrcPath,
    "src",
    "ohosTest",
    "module.json5",
  );
  const ohosTestModule =
    await readJson5ish<TestModuleConfig>(ohosTestModulePath);
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
    sharedModules: await discoverSharedModules(
      project,
      product,
      buildProfile.modules ?? [],
    ),
    ...buildArtifactPaths(moduleSrcPath, moduleName, product),
  };
}

async function discoverSharedModules(
  project: string,
  product: string,
  modules: ProjectModuleInfo[],
): Promise<SharedModuleInfo[]> {
  const sharedModules: SharedModuleInfo[] = [];
  for (const moduleInfo of modules) {
    const name = moduleInfo.name?.trim();
    const rawSrcPath = moduleInfo.srcPath?.trim();
    if (!name || !rawSrcPath || !appliesToProduct(moduleInfo, product)) {
      continue;
    }
    const srcPath = normalizeModuleSrcPath(rawSrcPath);
    const moduleConfigPath = path.join(
      project,
      srcPath,
      "src",
      "main",
      "module.json5",
    );
    let moduleConfig: MainModuleConfig;
    try {
      moduleConfig = await readJson5ish<MainModuleConfig>(moduleConfigPath);
    } catch (error) {
      throw new Error(
        `module ${name} module.json5 could not be read at ${moduleConfigPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (moduleConfig.module?.type !== "shared") {
      continue;
    }
    sharedModules.push({
      name,
      srcPath,
      outputDir: path.join(
        project,
        srcPath,
        "build",
        product,
        "outputs",
        product,
      ),
    });
  }
  return sharedModules;
}

function appliesToProduct(
  moduleInfo: ProjectModuleInfo,
  product: string,
): boolean {
  if (!moduleInfo.targets || moduleInfo.targets.length === 0) {
    return true;
  }
  return moduleInfo.targets.some((target) =>
    target.applyToProducts?.includes(product),
  );
}

async function readJson5ish<T>(filePath: string): Promise<T> {
  return parseJson5ish(await fs.readFile(filePath, "utf-8")) as T;
}

function buildArtifactPaths(
  moduleSrcPath: string,
  moduleName: string,
  product: string,
): Pick<ProjectInfo, "appHap" | "testHap"> {
  const outputRoot = path.join(moduleSrcPath, "build", product, "outputs");
  return {
    appHap: path.join(
      outputRoot,
      product,
      `${moduleName}-${product}-unsigned.hap`,
    ),
    testHap: path.join(
      outputRoot,
      "ohosTest",
      `${moduleName}-ohosTest-unsigned.hap`,
    ),
  };
}

export function selectEntryModule(
  modules: ProjectModuleInfo[],
): ProjectModuleInfo {
  return (
    modules.find((item) => item.name === "entry") ??
    modules.find((item) => item.srcPath?.includes("entry")) ??
    modules[0] ??
    {}
  );
}

export function normalizeModuleSrcPath(value: string): string {
  return value.replace(/^\.\//, "");
}

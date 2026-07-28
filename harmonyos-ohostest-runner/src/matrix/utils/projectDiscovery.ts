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

interface ModulePackageConfig {
  name?: string;
  dependencies?: Record<string, unknown>;
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
  const moduleInfo = await selectHapModule(
    project,
    product,
    buildProfile.modules ?? [],
  );
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
    const sharedModule = await discoverSharedModule(
      project,
      product,
      moduleInfo,
    );
    if (sharedModule) sharedModules.push(sharedModule);
  }
  return orderSharedModules(sharedModules);
}

async function discoverSharedModule(
  project: string,
  product: string,
  moduleInfo: ProjectModuleInfo,
): Promise<SharedModuleInfo | undefined> {
  const name = moduleInfo.name?.trim();
  const rawSrcPath = moduleInfo.srcPath?.trim();
  if (!name || !rawSrcPath || !appliesToProduct(moduleInfo, product)) {
    return undefined;
  }
  const srcPath = normalizeModuleSrcPath(rawSrcPath);
  const moduleConfig = await readMainModuleConfig(project, name, srcPath);
  if (moduleConfig.module?.type !== "shared") return undefined;
  const packageConfig = await readModulePackageConfig(
    name,
    path.join(project, srcPath, "oh-package.json5"),
  );
  return {
    name,
    srcPath,
    packageName: packageConfig.name ?? name,
    dependencies: Object.keys(packageConfig.dependencies ?? {}),
    outputDir: path.join(
      project,
      srcPath,
      "build",
      product,
      "outputs",
      product,
    ),
  };
}

async function readMainModuleConfig(
  project: string,
  moduleName: string,
  srcPath: string,
): Promise<MainModuleConfig> {
  const moduleConfigPath = path.join(
    project,
    srcPath,
    "src",
    "main",
    "module.json5",
  );
  try {
    return await readJson5ish<MainModuleConfig>(moduleConfigPath);
  } catch (error) {
    throw new Error(
      `module ${moduleName} module.json5 could not be read at ${moduleConfigPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function readModulePackageConfig(
  moduleName: string,
  packageConfigPath: string,
): Promise<ModulePackageConfig> {
  try {
    return await readJson5ish<ModulePackageConfig>(packageConfigPath);
  } catch (error) {
    throw new Error(
      `module ${moduleName} oh-package.json5 could not be read at ${packageConfigPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function orderSharedModules(
  modules: SharedModuleInfo[],
): SharedModuleInfo[] {
  const byPackageName = new Map(
    modules.map((moduleInfo) => [moduleInfo.packageName, moduleInfo]),
  );
  const ordered: SharedModuleInfo[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (moduleInfo: SharedModuleInfo): void => {
    if (visited.has(moduleInfo.packageName)) return;
    if (visiting.has(moduleInfo.packageName)) {
      throw new Error(
        `shared module dependency cycle includes ${moduleInfo.packageName}`,
      );
    }
    visiting.add(moduleInfo.packageName);
    for (const dependency of moduleInfo.dependencies) {
      const sharedDependency = byPackageName.get(dependency);
      if (sharedDependency) visit(sharedDependency);
    }
    visiting.delete(moduleInfo.packageName);
    visited.add(moduleInfo.packageName);
    ordered.push(moduleInfo);
  };
  for (const moduleInfo of modules) visit(moduleInfo);
  return ordered;
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

export async function selectHapModule(
  project: string,
  product: string,
  modules: ProjectModuleInfo[],
): Promise<ProjectModuleInfo> {
  const matches: ProjectModuleInfo[] = [];
  for (const moduleInfo of modules) {
    if (!appliesToProduct(moduleInfo, product)) continue;
    const name = moduleInfo.name?.trim();
    const rawSrcPath = moduleInfo.srcPath?.trim();
    if (!name || !rawSrcPath) continue;
    const hvigorfile = await fs.readFile(
      path.join(
        project,
        normalizeModuleSrcPath(rawSrcPath),
        "hvigorfile.ts",
      ),
      "utf-8",
    );
    if (/\bhapTasks\b/.test(hvigorfile)) {
      matches.push(moduleInfo);
    }
  }
  if (matches.length === 0) {
    throw new Error(`project_hap_module_not_found: ${project}`);
  }
  if (matches.length > 1) {
    throw new Error(
      `project_hap_module_ambiguous: ${matches
        .map((moduleInfo) => moduleInfo.name)
        .join(", ")}`,
    );
  }
  return matches[0]!;
}

export function normalizeModuleSrcPath(value: string): string {
  return value.replace(/^\.\//, "");
}

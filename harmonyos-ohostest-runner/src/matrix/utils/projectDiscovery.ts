import fs from "node:fs/promises";
import path from "node:path";
import { parseJson5ish } from "./json5ish.js";

export interface ProjectInfo {
  product: string;
  moduleName: string;
  moduleSrcPath: string;
  bundleName: string;
  testModuleName: string;
  appHap: string;
  testHap: string;
}

export interface ProjectModuleInfo {
  name?: string;
  srcPath?: string;
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
    ...buildArtifactPaths(moduleSrcPath, moduleName, product),
  };
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

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

export async function discoverProjectInfo(project: string): Promise<ProjectInfo> {
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

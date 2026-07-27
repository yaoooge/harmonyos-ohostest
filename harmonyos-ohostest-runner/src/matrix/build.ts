import fs from "node:fs/promises";
import path from "node:path";
import { verifyFileExists } from "../shared/utils/file.js";
import { shellQuote } from "../shared/utils/shellQuote.js";
import type { BuildOutcome, CommandResult, MatrixConfig } from "./types/index.js";

const BUILD_STDERR_TAIL_LINES = 15;

export async function runBuild(input: {
  config: MatrixConfig;
  skipBuild: boolean;
  runCommand: (command: string) => Promise<CommandResult>;
  diagnostics: string[];
}): Promise<BuildOutcome> {
  const started = Date.now();
  if (!input.skipBuild) {
    for (const command of buildCommands(input.config)) {
      const result = await input.runCommand(command);
      if (result.exitCode !== 0) {
        input.diagnostics.push(`构建命令失败：${command}`);
        input.diagnostics.push(...tailOfStderr(result.stderr));
        return {
          result: {
            status: "blocked",
            appHap: input.config.artifacts.appHap,
            testHap: input.config.artifacts.testHap,
            durationMs: Date.now() - started,
            blockedReason: "build_failed",
          },
        };
      }
    }
  }

  try {
    await verifyFileExists(input.config.artifacts.appHap);
    await verifyFileExists(input.config.artifacts.testHap);
  } catch (error) {
    input.diagnostics.push(`HAP 文件不存在：${error instanceof Error ? error.message : String(error)}`);
    return {
      result: {
        status: "blocked",
        appHap: input.config.artifacts.appHap,
        testHap: input.config.artifacts.testHap,
        durationMs: Date.now() - started,
        blockedReason: "hap_missing",
      },
    };
  }

  let hspPaths: string[];
  try {
    hspPaths = await resolveHspPaths(input.config);
  } catch (error) {
    input.diagnostics.push(
      `HSP 产物解析失败：${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      result: {
        status: "blocked",
        appHap: input.config.artifacts.appHap,
        testHap: input.config.artifacts.testHap,
        durationMs: Date.now() - started,
        blockedReason: "hap_missing",
      },
    };
  }

  return {
    result: {
      status: "passed",
      appHap: input.config.artifacts.appHap,
      testHap: input.config.artifacts.testHap,
      durationMs: Date.now() - started,
    },
    installArtifacts: {
      hspPaths,
      appHap: input.config.artifacts.appHap,
      testHap: input.config.artifacts.testHap,
    },
  };
}

async function resolveHspPaths(config: MatrixConfig): Promise<string[]> {
  const suffix = hspSignatureSuffix(config.artifacts.appHap);
  const hspPaths: string[] = [];
  for (const moduleInfo of config.sharedModules) {
    const entries = await fs.readdir(moduleInfo.outputDir, {
      withFileTypes: true,
    });
    const candidates = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
      .map((entry) => path.join(moduleInfo.outputDir, entry.name))
      .sort();
    if (candidates.length !== 1) {
      throw new Error(
        `shared module ${moduleInfo.name} expected exactly one ${suffix} file in ${moduleInfo.outputDir}; found ${candidates.length}: ${candidates.join(", ") || "none"}`,
      );
    }
    hspPaths.push(candidates[0]!);
  }
  return hspPaths;
}

function hspSignatureSuffix(
  appHap: string,
): "-unsigned.hsp" | "-signed.hsp" {
  if (appHap.endsWith("-unsigned.hap")) {
    return "-unsigned.hsp";
  }
  if (appHap.endsWith("-signed.hap")) {
    return "-signed.hsp";
  }
  throw new Error(
    `cannot determine HSP signature type from app HAP: ${appHap}`,
  );
}

export function buildTestHapCommand(config: MatrixConfig): string {
  const buildExecutable = shellQuote(config.paths.hvigorw);
  return `${buildExecutable} --mode module -p module=${config.module}@ohosTest ${config.build.testTask} --no-daemon`;
}

function buildCommands(config: MatrixConfig): string[] {
  const packageManager = shellQuote(config.paths.ohpm);
  const buildExecutable = shellQuote(config.paths.hvigorw);
  const appBase = `${buildExecutable} --mode ${config.build.mode} -p product=${config.product}`;
  const appSuffix = "--analyze=normal --parallel --incremental --no-daemon";
  const testBase = `${buildExecutable} --mode module -p module=${config.module}@ohosTest`;
  return [
    `${buildExecutable} clean --no-daemon`,
    `${packageManager} install`,
    `${appBase} ${config.build.appTask} ${appSuffix}`,
    `${testBase} ${config.build.testTask} --no-daemon --stacktrace`,
  ];
}

function tailOfStderr(stderr: string): string[] {
  const trimmed = (stderr ?? "").trim();
  if (!trimmed) {
    return [];
  }
  const lines = trimmed.split(/\r?\n/);
  const tail = lines.slice(-BUILD_STDERR_TAIL_LINES);
  const prefix = lines.length > BUILD_STDERR_TAIL_LINES ? "[build stderr 尾部] " : "[build stderr] ";
  return [prefix + tail.join("\n")];
}

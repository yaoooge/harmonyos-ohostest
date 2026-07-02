import type { RunCaseInput } from "../case/types/index.js";

export function parseOhosTestCaseArgs(args: string[]): RunCaseInput {
  const values = new Map<string, string>();
  const devices: string[] = [];
  const knownArgs = new Set([
    "--case",
    "--machine-config",
    "--out",
    "--device",
    "--skip-build",
    "--keep-emulators",
    "--keep-workdir",
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg?.startsWith("--")) {
      continue;
    }
    if (!knownArgs.has(arg)) {
      throw new Error(`未知参数 ${arg}。`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`参数 ${arg} 缺少取值。`);
    }
    if (arg === "--device") {
      devices.push(value);
    } else {
      values.set(arg, value);
    }
    index += 1;
  }

  const caseDir = values.get("--case");
  if (!caseDir) {
    throw new Error("缺少必填参数 --case。");
  }
  const machineConfigPath = values.get("--machine-config");

  return {
    caseDir,
    ...(machineConfigPath ? { machineConfigPath } : {}),
    ...(values.has("--out") ? { out: values.get("--out") } : {}),
    ...(devices.length > 0 ? { devices } : {}),
    ...(values.has("--skip-build") ? { skipBuild: readBoolean(values.get("--skip-build")) } : {}),
    ...(values.has("--keep-emulators")
      ? { keepEmulators: readBoolean(values.get("--keep-emulators")) }
      : {}),
    ...(values.has("--keep-workdir") ? { keepWorkdir: readBoolean(values.get("--keep-workdir")) } : {}),
  };
}

function readBoolean(value: string | undefined): boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error("boolean 参数必须是 true 或 false。");
}

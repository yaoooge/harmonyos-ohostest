import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { DeviceConfig } from "../matrix/types/index.js";
import { foldTriggerTemplate } from "./foldTriggerTemplate.js";
import type { FoldServerInstance } from "./types/index.js";
import { healthCheck } from "./utils/healthCheck.js";
import { allocateFoldServerPort } from "./utils/ports.js";

/**
 * 为指定设备启动 fold-server 进程。
 * 自动分配端口，启动 detached 子进程，等待健康检查通过。
 */
export async function startFoldServer(
  device: DeviceConfig,
  foldServerScript: string,
): Promise<FoldServerInstance> {
  const { port, devicePort } = allocateFoldServerPort();
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  const child = spawn(
    pythonCmd,
    [
      foldServerScript,
      "--profile",
      device.profile ?? device.id,
      "--port",
      String(port),
      "--target",
      device.target,
    ],
    {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  // Collect startup output for diagnostics
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf-8");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf-8");
  });

  // Wait for health check
  const healthy = await healthCheck(port);
  if (!healthy) {
    killFoldServer({ port, devicePort, process: child });
    const details = [`fold-server startup output:`];
    if (stdout.trim()) details.push(`stdout: ${stdout.trim()}`);
    if (stderr.trim()) details.push(`stderr: ${stderr.trim()}`);
    throw new Error(details.join("\n"));
  }

  return { port, devicePort, process: child };
}

/**
 * 停止 fold-server 进程。
 */
export function killFoldServer(instance: FoldServerInstance): void {
  try {
    if (instance.process.pid) {
      process.kill(-instance.process.pid, "SIGTERM");
    }
  } catch {
    // Process may already be dead
  }
}

/**
 * 将 FoldTrigger.ets 部署到目标 HarmonyOS 工程的 ohosTest 目录。
 * 总是覆盖以确保多设备场景下每个设备获得正确的端口。
 * 返回部署后的文件路径。
 */
export async function deployFoldTrigger(
  projectPath: string,
  devicePort: number,
  moduleSrcPath: string = "entry",
): Promise<string> {
  const targetDir = path.join(projectPath, moduleSrcPath, "src", "ohosTest", "ets", "util");
  const targetFile = path.join(targetDir, "FoldTrigger.ets");

  await fs.mkdir(targetDir, { recursive: true });
  const content = foldTriggerTemplate(devicePort);
  await fs.writeFile(targetFile, content, "utf-8");
  return targetFile;
}

export { healthCheck };
export type { FoldServerInstance };

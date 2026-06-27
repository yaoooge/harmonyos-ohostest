import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import type { DeviceConfig } from "./types.js";
import { foldTriggerTemplate } from "./fold-template.js";

const FOLD_SERVER_START_PORT = 8766;
const HEALTH_CHECK_TIMEOUT_MS = 10000;
const HEALTH_CHECK_INTERVAL_MS = 500;

export interface FoldServerInstance {
  port: number;
  devicePort: number;
  process: ChildProcess;
}

let nextPort = FOLD_SERVER_START_PORT;

function allocatePort(): { port: number; devicePort: number } {
  const port = nextPort;
  nextPort += 1;
  return { port, devicePort: port - 1 };
}

/**
 * 为指定设备启动 fold-server 进程。
 * 自动分配端口，启动 detached 子进程，等待健康检查通过。
 */
export async function startFoldServer(
  device: DeviceConfig,
  foldServerScript: string,
): Promise<FoldServerInstance> {
  const { port, devicePort } = allocatePort();
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
  const healthy = await healthCheck(port, HEALTH_CHECK_TIMEOUT_MS);
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
 * 对指定端口执行健康检查轮询。
 * 成功时返回 true，超时返回 false。
 */
export async function healthCheck(port: number, timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await checkHealthOnce(port);
    if (ok) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }
  return false;
}

function checkHealthOnce(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(
      `http://127.0.0.1:${port}/health`,
      { timeout: HEALTH_CHECK_INTERVAL_MS },
      (response) => {
        resolve(response.statusCode === 200);
        response.resume();
      },
    );
    request.on("error", () => {
      resolve(false);
    });
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
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

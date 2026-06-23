import assert from "node:assert/strict";
import test from "node:test";
import { buildStartEmulatorCommand, ensureTargetReady, waitForTargetDisconnected } from "../src/device.js";
import type { DeviceConfig, MatrixConfig } from "../src/types.js";

function makeConfig(): MatrixConfig {
  return {
    project: "D:\\Projects\\ResponsiveRepeatLayout",
    product: "default",
    module: "entry",
    bundleName: "zhsc.1.xxxxxx",
    testModule: "entry_test",
    testRunner: "OpenHarmonyTestRunner",
    testFolders: {},
    timeoutMs: 120000,
    build: {
      mode: "project",
      appTask: "assembleApp",
      testTask: "ohosTest@PackageHap",
    },
    paths: {
      hvigorw: "hvigorw",
      hdc: "hdc",
      emulatorBin: "D:\\Software\\Deveco Studio\\tools\\emulator\\Emulator.exe",
      emulatorDeployedDir: "D:\\Software\\Deveco Studio\\emulator\\deployed",
    },
    artifacts: {
      appHap: "D:\\Projects\\ResponsiveRepeatLayout\\entry-default-unsigned.hap",
      testHap: "D:\\Projects\\ResponsiveRepeatLayout\\entry-ohosTest-unsigned.hap",
    },
    devices: [],
  };
}

test("buildStartEmulatorCommand quotes Windows profile and instance path with double quotes", () => {
  const device: DeviceConfig = {
    id: "phone",
    profile: "Mate 80 Pro",
    target: "127.0.0.1:15001",
    hdcPort: 15001,
    startEmulator: true,
  };

  const command = buildStartEmulatorCommand(makeConfig(), device, "win32");

  assert.equal(
    command,
    '"D:\\Software\\Deveco Studio\\tools\\emulator\\Emulator.exe" -start "Mate 80 Pro" -instancePath "D:\\Software\\Deveco Studio\\emulator\\deployed" -hdcport 15001',
  );
});

test("ensureTargetReady waits up to 120 polling attempts for slow Windows emulator startup", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((callback: () => void) => {
    callback();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  try {
    let attempts = 0;
    const config = makeConfig();
    const device: DeviceConfig = {
      id: "phone",
      target: "127.0.0.1:15001",
      startEmulator: true,
    };

    await ensureTargetReady({
      config,
      device,
      cwd: config.project,
      outDir: "out",
      runCommand: async () => {
        attempts += 1;
        return {
          stdout: attempts === 120 ? "127.0.0.1:15001\tConnected\n" : "[Empty]\n",
          stderr: "",
          exitCode: 0,
          durationMs: 1,
        };
      },
    });

    assert.equal(attempts, 120);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("waitForTargetDisconnected waits before allowing the next emulator to start", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((callback: () => void) => {
    callback();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  try {
    let attempts = 0;
    const config = makeConfig();
    const device: DeviceConfig = {
      id: "phone",
      target: "127.0.0.1:15001",
      startEmulator: true,
    };

    const disconnected = await waitForTargetDisconnected({
      config,
      device,
      cwd: config.project,
      outDir: "out",
      runCommand: async () => {
        attempts += 1;
        return {
          stdout: attempts < 3 ? "127.0.0.1:15001\tConnected\n" : "[Empty]\n",
          stderr: "",
          exitCode: 0,
          durationMs: 1,
        };
      },
    });

    assert.equal(disconnected, true);
    assert.equal(attempts, 3);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

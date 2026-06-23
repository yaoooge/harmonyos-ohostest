import assert from "node:assert/strict";
import test from "node:test";
import { buildStartEmulatorCommand } from "../src/device.js";
import type { DeviceConfig, MatrixConfig } from "../src/types.js";

function makeConfig(): MatrixConfig {
  return {
    project: "D:\\Projects\\ResponsiveRepeatLayout",
    product: "default",
    module: "entry",
    bundleName: "zhsc.1.xxxxxx",
    testModule: "entry_test",
    testRunner: "OpenHarmonyTestRunner",
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

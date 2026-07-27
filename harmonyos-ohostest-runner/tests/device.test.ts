import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStartEmulatorCommand,
  ensureTargetReady,
  installHaps,
  isInstallFailure,
  waitForTargetDisconnected,
} from "../src/matrix/device.js";
import type {
  DeviceConfig,
  InstallArtifacts,
  MatrixConfig,
} from "../src/matrix/types/index.js";

function makeConfig(): MatrixConfig {
  return {
    project: "D:\\Projects\\ResponsiveRepeatLayout",
    product: "default",
    module: "entry",
    moduleSrcPath: "entry",
    sharedModules: [],
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
      ohpm: "ohpm",
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

test("installHaps ignores uninstall failure and uninstalls the bundle before installing HAPs", async () => {
  const config = makeConfig();
  config.artifacts = {
    appHap: "/tmp/app.hap",
    testHap: "/tmp/test.hap",
  };
  const device: DeviceConfig = {
    id: "phone",
    target: "127.0.0.1:15001",
    startEmulator: false,
  };
  const commands: string[] = [];

  await installHaps(
    {
      config,
      device,
      cwd: config.project,
      outDir: "out",
      runCommand: async (command) => {
        commands.push(command);
        return {
          stdout: "",
          stderr: command.includes(" uninstall ") ? "bundle not found" : "",
          exitCode: command.includes(" uninstall ") ? 1 : 0,
          durationMs: 1,
        };
      },
    },
    {
      hspPaths: [],
      appHap: "/tmp/app.hap",
      testHap: "/tmp/test.hap",
    },
  );

  assert.deepEqual(commands, [
    "hdc -t 127.0.0.1:15001 uninstall zhsc.1.xxxxxx",
    "hdc -t 127.0.0.1:15001 install -r /tmp/app.hap /tmp/test.hap",
  ]);
});

test("installHaps installs HSPs before the app and test HAPs", async () => {
  const config = makeConfig();
  const device: DeviceConfig = {
    id: "phone",
    target: "127.0.0.1:15001",
    startEmulator: false,
  };
  const artifacts: InstallArtifacts = {
    hspPaths: ["/tmp/common.hsp", "/tmp/styles.hsp"],
    appHap: "/tmp/app.hap",
    testHap: "/tmp/test.hap",
  };
  const commands: string[] = [];

  await installHaps(
    {
      config,
      device,
      cwd: config.project,
      outDir: "out",
      runCommand: async (command) => {
        commands.push(command);
        return {
          stdout: "",
          stderr: "",
          exitCode: 0,
          durationMs: 1,
        };
      },
    },
    artifacts,
  );

  assert.deepEqual(commands, [
    "hdc -t 127.0.0.1:15001 uninstall zhsc.1.xxxxxx",
    "hdc -t 127.0.0.1:15001 install -r /tmp/common.hsp",
    "hdc -t 127.0.0.1:15001 install -r /tmp/styles.hsp",
    "hdc -t 127.0.0.1:15001 install -r /tmp/app.hap /tmp/test.hap",
  ]);
});

test("installHaps rejects AppMod install errors even when hdc exits zero", async () => {
  const config = makeConfig();
  const device: DeviceConfig = {
    id: "phone",
    target: "127.0.0.1:15001",
    startEmulator: false,
  };
  const artifacts: InstallArtifacts = {
    hspPaths: ["/tmp/common.hsp"],
    appHap: "/tmp/app.hap",
    testHap: "/tmp/test.hap",
  };
  const commands: string[] = [];

  await assert.rejects(
    installHaps(
      {
        config,
        device,
        cwd: config.project,
        outDir: "out",
        runCommand: async (command) => {
          commands.push(command);
          return {
            stdout: command.includes(" install ")
              ? "[Info]App install path:/tmp/app.hap msg:error: failed to install bundle. code:9568305 error: Failed to install the HAP or HSP because the dependent module does not exist. entry's dependent module: common does not exist"
              : "",
            stderr: "",
            exitCode: 0,
            durationMs: 1,
          };
        },
      },
      artifacts,
    ),
    /install_failed/,
  );
  assert.deepEqual(commands, [
    "hdc -t 127.0.0.1:15001 uninstall zhsc.1.xxxxxx",
    "hdc -t 127.0.0.1:15001 install -r /tmp/common.hsp",
  ]);
});

test("isInstallFailure checks stderr and preserves normal zero-exit output", () => {
  assert.equal(
    isInstallFailure({
      stdout: "",
      stderr: "error: failed to install bundle",
      exitCode: 0,
      durationMs: 1,
    }),
    true,
  );
  assert.equal(
    isInstallFailure({
      stdout: "AppMod finish",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    }),
    false,
  );
});

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

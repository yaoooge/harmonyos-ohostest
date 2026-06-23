import assert from "node:assert/strict";
import test from "node:test";
import { parseOhosTestMatrixArgs } from "../src/index.js";

test("parseOhosTestMatrixArgs parses required and optional arguments", () => {
  const parsed = parseOhosTestMatrixArgs([
    "--project",
    "/tmp/project",
    "--machine-config",
    "/tmp/matrix.json",
    "--out",
    "/tmp/result.json",
    "--device",
    "phone",
    "--device",
    "tablet",
    "--test-class",
    "HomePageAdaptiveTest",
    "--skip-build",
    "true",
    "--keep-emulators",
    "false",
  ]);

  assert.deepEqual(parsed, {
    project: "/tmp/project",
    machineConfigPath: "/tmp/matrix.json",
    out: "/tmp/result.json",
    devices: ["phone", "tablet"],
    testClass: "HomePageAdaptiveTest",
    skipBuild: true,
    keepEmulators: false,
  });
});

test("parseOhosTestMatrixArgs requires only project", () => {
  assert.throws(() => parseOhosTestMatrixArgs([]), /--project/);
  assert.deepEqual(parseOhosTestMatrixArgs(["--project", "/tmp/project"]), {
    project: "/tmp/project",
  });
});

test("parseOhosTestMatrixArgs rejects removed --config alias", () => {
  assert.throws(
    () =>
      parseOhosTestMatrixArgs([
        "--project",
        "/tmp/project",
        "--config",
        "/tmp/old-project-config.json",
      ]),
    /未知参数 --config/,
  );
});

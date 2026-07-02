import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDeviceSuiteOverrides, loadCaseMetadata } from "../src/case/config.js";
import type { MatrixConfig } from "../src/index.js";

async function makeTempCase(t: test.TestContext): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ohostest-case-config-"));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  const caseDir = path.join(root, "case");
  await fs.mkdir(caseDir, { recursive: true });
  return caseDir;
}

test("loadCaseMetadata reads metadata and resolves patch and base paths", async (t) => {
  const caseDir = await makeTempCase(t);
  await fs.mkdir(path.join(caseDir, "..", "base"), { recursive: true });
  await fs.writeFile(path.join(caseDir, "test_patch.patch"), "", "utf-8");
  await fs.writeFile(path.join(caseDir, "golden_patch.patch"), "", "utf-8");
  await fs.writeFile(
    path.join(caseDir, "metadata.json"),
    JSON.stringify({
      case_id: "responsive-repeat-layout",
      base_project: "base",
      test_patch: "test_patch.patch",
      golden_patch: "golden_patch.patch",
      fail_to_pass: ["should_adapt"],
      pass_to_pass: ["should_launch"],
      device_test_suites: {
        phone: [{ suite: "CommonPassToPassTest" }],
      },
    }),
    "utf-8",
  );

  const metadata = await loadCaseMetadata(caseDir);

  assert.equal(metadata.caseId, "responsive-repeat-layout");
  assert.equal(metadata.baseProject, path.resolve(caseDir, "..", "base"));
  assert.equal(metadata.testPatch, path.join(caseDir, "test_patch.patch"));
  assert.equal(metadata.goldenPatch, path.join(caseDir, "golden_patch.patch"));
  assert.deepEqual(metadata.deviceTestSuites.phone?.map((suite) => suite.suite), ["CommonPassToPassTest"]);
});

test("buildDeviceSuiteOverrides validates metadata devices against machine devices", () => {
  const matrixConfig = {
    devices: [
      { id: "phone", target: "127.0.0.1:15001", startEmulator: false },
      { id: "tablet", target: "127.0.0.1:15003", startEmulator: false },
    ],
  } as MatrixConfig;

  const overrides = buildDeviceSuiteOverrides(
    {
      caseId: "case",
      caseDir: "/tmp/case",
      baseProject: "/tmp/base",
      testPatch: "/tmp/case/test_patch.patch",
      goldenPatch: "/tmp/case/golden_patch.patch",
      failToPass: [],
      passToPass: [],
      deviceTestSuites: {
        phone: [{ suite: "CommonPassToPassTest" }, { suite: "CommonPassToPassTest" }],
      },
    },
    matrixConfig,
  );

  assert.deepEqual(overrides, { phone: ["CommonPassToPassTest"] });
  assert.throws(
    () =>
      buildDeviceSuiteOverrides(
        {
          caseId: "case",
          caseDir: "/tmp/case",
          baseProject: "/tmp/base",
          testPatch: "/tmp/case/test_patch.patch",
          goldenPatch: "/tmp/case/golden_patch.patch",
          failToPass: [],
          passToPass: [],
          deviceTestSuites: { foldable: [{ suite: "MdFailToPassTest" }] },
        },
        matrixConfig,
      ),
    /metadata device foldable is missing in machine config/,
  );
});

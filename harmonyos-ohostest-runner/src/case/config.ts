import fs from "node:fs/promises";
import path from "node:path";
import type { MatrixConfig } from "../matrix/types/index.js";
import type {
  CaseDeviceSelection,
  CaseDeviceSuite,
  CaseMetadata,
} from "./types/index.js";

interface RawCaseMetadata {
  case_id?: string;
  base_project?: string;
  test_patch?: string;
  golden_patch?: string;
  fail_to_pass?: unknown;
  pass_to_pass?: unknown;
  device_test_suites?: unknown;
  enabled_devices?: unknown;
}

export async function loadCaseMetadata(
  caseDirInput: string,
): Promise<CaseMetadata> {
  const caseDir = path.resolve(caseDirInput);
  const metadataPath = path.join(caseDir, "metadata.json");
  const raw = JSON.parse(
    await fs.readFile(metadataPath, "utf-8"),
  ) as RawCaseMetadata;
  const caseId = readRequiredString(raw.case_id, "metadata.case_id");
  const baseProjectName = readRequiredString(
    raw.base_project,
    "metadata.base_project",
  );
  const testPatchName = readRequiredString(
    raw.test_patch,
    "metadata.test_patch",
  );
  const goldenPatchName = readRequiredString(
    raw.golden_patch,
    "metadata.golden_patch",
  );
  const baseProject = await resolveBaseProject(caseDir, baseProjectName);
  const testPatch = await resolveExistingFile(
    caseDir,
    testPatchName,
    "test_patch",
  );
  const goldenPatch = await resolveExistingFile(
    caseDir,
    goldenPatchName,
    "golden_patch",
  );

  return {
    caseId,
    caseDir,
    baseProject,
    testPatch,
    goldenPatch,
    failToPass: readStringArray(raw.fail_to_pass, "metadata.fail_to_pass"),
    passToPass: readStringArray(raw.pass_to_pass, "metadata.pass_to_pass"),
    deviceTestSuites: readDeviceTestSuites(raw.device_test_suites),
    enabledDevices: readOptionalStringArray(
      raw.enabled_devices,
      "metadata.enabled_devices",
    ),
  };
}

export function buildCaseDeviceSelection(
  metadata: CaseMetadata,
  matrixConfig: Pick<MatrixConfig, "devices">,
  requestedDevices?: string[],
): CaseDeviceSelection {
  const machineDeviceIds = new Set(
    matrixConfig.devices.map((device) => device.id),
  );

  if (metadata.deviceTestSuites) {
    const metadataDeviceIds = Object.keys(metadata.deviceTestSuites);
    const overrides: Record<string, string[]> = {};

    for (const deviceId of metadataDeviceIds) {
      if (!machineDeviceIds.has(deviceId)) {
        throw new Error(
          `metadata device ${deviceId} is missing in machine config.`,
        );
      }
      const suites = metadata.deviceTestSuites[deviceId] ?? [];
      const deduped = dedupe(suites.map((suite) => suite.suite));
      if (deduped.length === 0) {
        throw new Error(`metadata device ${deviceId} has no suites.`);
      }
      overrides[deviceId] = deduped;
    }

    return filterCaseDeviceSelection(
      {
        devices: metadataDeviceIds,
        deviceSuiteOverrides: overrides,
        runAllTests: false,
      },
      requestedDevices,
    );
  }

  const devices =
    metadata.enabledDevices ?? matrixConfig.devices.map((device) => device.id);
  for (const deviceId of devices) {
    if (!machineDeviceIds.has(deviceId)) {
      throw new Error(
        `metadata device ${deviceId} is missing in machine config.`,
      );
    }
  }

  return filterCaseDeviceSelection(
    {
      devices,
      runAllTests: true,
    },
    requestedDevices,
  );
}

function filterCaseDeviceSelection(
  selection: CaseDeviceSelection,
  requestedDevices?: string[],
): CaseDeviceSelection {
  if (!requestedDevices || requestedDevices.length === 0) {
    return selection;
  }

  const allowedDevices = new Set(selection.devices);
  const devices = dedupe(requestedDevices);
  for (const deviceId of devices) {
    if (!allowedDevices.has(deviceId)) {
      throw new Error(
        `case device ${deviceId} is not enabled by metadata or machine config.`,
      );
    }
  }

  const overrides = selection.deviceSuiteOverrides;
  if (!overrides) {
    return { ...selection, devices };
  }

  return {
    ...selection,
    devices,
    deviceSuiteOverrides: Object.fromEntries(
      devices.map((deviceId) => [deviceId, overrides[deviceId] ?? []]),
    ),
  };
}

async function resolveBaseProject(
  caseDir: string,
  value: string,
): Promise<string> {
  const candidates = [
    path.resolve(caseDir, value),
    path.resolve(caseDir, "..", value),
  ];
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }
  throw new Error(`case_base_project_not_found: ${value}`);
}

async function resolveExistingFile(
  caseDir: string,
  value: string,
  label: string,
): Promise<string> {
  const resolved = path.resolve(caseDir, value);
  try {
    const stat = await fs.stat(resolved);
    if (stat.isFile()) {
      return resolved;
    }
  } catch {
    // Fall through to a descriptive error.
  }
  throw new Error(`patch_file_missing: ${label} ${value}`);
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function readStringArray(value: unknown, label: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value.map((item, index) =>
    readRequiredString(item, `${label}[${index}]`),
  );
}

function readOptionalStringArray(
  value: unknown,
  label: string,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const values = readStringArray(value, label);
  if (values.length === 0) {
    throw new Error(`${label} must contain at least one device.`);
  }
  return dedupe(values);
}

function readDeviceTestSuites(
  value: unknown,
): Record<string, CaseDeviceSuite[]> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("metadata.device_test_suites must be an object.");
  }
  const result: Record<string, CaseDeviceSuite[]> = {};
  for (const [deviceId, rawSuites] of Object.entries(value)) {
    if (!Array.isArray(rawSuites)) {
      throw new Error(
        `metadata.device_test_suites.${deviceId} must be an array.`,
      );
    }
    result[deviceId] = rawSuites.map((rawSuite, index) =>
      readCaseDeviceSuite(rawSuite, deviceId, index),
    );
  }
  if (Object.keys(result).length === 0) {
    throw new Error(
      "metadata.device_test_suites must contain at least one device.",
    );
  }
  return result;
}

function readCaseDeviceSuite(
  value: unknown,
  deviceId: string,
  index: number,
): CaseDeviceSuite {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `metadata.device_test_suites.${deviceId}[${index}] must be an object.`,
    );
  }
  const record = value as { suite?: unknown; file?: unknown };
  const suite = readRequiredString(
    record.suite,
    `metadata.device_test_suites.${deviceId}[${index}].suite`,
  );
  return {
    suite,
    ...(typeof record.file === "string" && record.file.trim().length > 0
      ? { file: record.file.trim() }
      : {}),
  };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

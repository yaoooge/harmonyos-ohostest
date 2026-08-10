# Case Device Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow case-mode runs to accept repeatable `--device <id>` arguments, execute only those case-approved devices, and release the runner as version `0.1.2`.

**Architecture:** Parse device IDs into `RunCaseInput`, then apply filtering inside `buildCaseDeviceSelection` after the existing metadata/machine validation has produced the case-approved selection. Pass the CLI selection from the case runner into that function so SWE and Answer reuse one filtered result; leave the matrix runner unchanged.

**Tech Stack:** TypeScript 6, Node.js test runner, ESLint, Prettier, npm.

---

## File map

- `harmonyos-ohostest-runner/tests/cli.test.ts`: command-line parsing regression tests.
- `harmonyos-ohostest-runner/src/cli/parseCaseArgs.ts`: repeatable case `--device` parsing.
- `harmonyos-ohostest-runner/src/case/types/index.ts`: optional `RunCaseInput.devices` type.
- `harmonyos-ohostest-runner/tests/case-config.test.ts`: pure selection/filtering tests.
- `harmonyos-ohostest-runner/src/case/config.ts`: case-approved device filtering and override pruning.
- `harmonyos-ohostest-runner/tests/case-runner.test.ts`: end-to-end case orchestration assertion.
- `harmonyos-ohostest-runner/src/case/runner.ts`: forward CLI devices into selection.
- `harmonyos-ohostest-runner/README.md` and `harmonyos-ohostest-runner/docs/usage/case.md`: user-facing syntax and semantics.
- `harmonyos-ohostest-runner/package.json` and `harmonyos-ohostest-runner/CHANGELOG.md`: version `0.1.2` release metadata.

### Task 1: Parse repeatable case devices

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/cli.test.ts`
- Modify: `harmonyos-ohostest-runner/src/cli/parseCaseArgs.ts`
- Modify: `harmonyos-ohostest-runner/src/case/types/index.ts`

- [ ] **Step 1: Replace the rejection test with a failing parsing test**

```ts
test("parseOhosTestCaseArgs parses repeatable device filters", () => {
  assert.deepEqual(
    parseOhosTestCaseArgs([
      "--case", "/tmp/case",
      "--device", "phone",
      "--device", "tablet",
    ]),
    {
      caseDir: "/tmp/case",
      devices: ["phone", "tablet"],
      runMode: "answer",
    },
  );
});
```

- [ ] **Step 2: Run the CLI test and verify RED**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test --test-name-pattern="repeatable device filters" tests/cli.test.ts`

Expected: FAIL because case mode still throws `case_device_cli_not_supported`.

- [ ] **Step 3: Add the input type and parser support**

Add `devices?: string[]` to `RunCaseInput`. Add `"--device"` to `knownCaseArgs`, collect it in a separate array inside the parsing loop, and return `devices` only when at least one ID was supplied. Keep the existing missing-value validation.

```ts
const devices: string[] = [];

if (arg === "--device") {
  devices.push(value);
} else {
  values.set(arg, value);
}

return {
  caseDir,
  ...(devices.length > 0 ? { devices } : {}),
  // existing fields
};
```

- [ ] **Step 4: Run the CLI tests and verify GREEN**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test tests/cli.test.ts`

Expected: all CLI tests pass.

### Task 2: Filter the case-approved device selection

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/case-config.test.ts`
- Modify: `harmonyos-ohostest-runner/src/case/config.ts`

- [ ] **Step 1: Add failing selection tests**

Add focused tests that call `buildCaseDeviceSelection(metadata, matrixConfig, cliDevices)` and assert:

```ts
assert.deepEqual(
  buildCaseDeviceSelection(metadataWithSuites, matrixConfig, [
    "tablet",
    "phone",
    "tablet",
  ]),
  {
    devices: ["tablet", "phone"],
    deviceSuiteOverrides: {
      tablet: ["TabletSuite"],
      phone: ["PhoneSuite"],
    },
    runAllTests: false,
  },
);

assert.deepEqual(
  buildCaseDeviceSelection(
    { ...baseMetadata, enabledDevices: ["phone", "tablet"] },
    matrixConfig,
    ["tablet"],
  ),
  { devices: ["tablet"], runAllTests: true },
);

assert.deepEqual(
  buildCaseDeviceSelection(baseMetadata, matrixConfig, ["phone"]),
  { devices: ["phone"], runAllTests: true },
);

assert.throws(
  () => buildCaseDeviceSelection(metadataWithSuites, matrixConfig, ["watch"]),
  /case device watch is not enabled by metadata or machine config/,
);
```

- [ ] **Step 2: Run the config tests and verify RED**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test tests/case-config.test.ts`

Expected: FAIL because `buildCaseDeviceSelection` accepts only two arguments and does not filter.

- [ ] **Step 3: Implement a minimal post-validation filter**

Change the signature to accept `requestedDevices?: string[]`. Build the existing unfiltered `CaseDeviceSelection` first, then pass it through a helper:

```ts
function filterCaseDeviceSelection(
  selection: CaseDeviceSelection,
  requestedDevices?: string[],
): CaseDeviceSelection {
  if (!requestedDevices || requestedDevices.length === 0) return selection;
  const allowed = new Set(selection.devices);
  const devices = dedupe(requestedDevices);
  for (const deviceId of devices) {
    if (!allowed.has(deviceId)) {
      throw new Error(
        `case device ${deviceId} is not enabled by metadata or machine config.`,
      );
    }
  }
  if (!selection.deviceSuiteOverrides) return { ...selection, devices };
  return {
    ...selection,
    devices,
    deviceSuiteOverrides: Object.fromEntries(
      devices.map((deviceId) => [
        deviceId,
        selection.deviceSuiteOverrides?.[deviceId] ?? [],
      ]),
    ),
  };
}
```

Apply this helper to both the `device_test_suites` branch and the full-test branch only after all existing metadata-to-machine validation completes.

- [ ] **Step 4: Run the config tests and verify GREEN**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test tests/case-config.test.ts`

Expected: all case config tests pass.

### Task 3: Forward the filter through case orchestration

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/case-runner.test.ts`
- Modify: `harmonyos-ohostest-runner/src/case/runner.ts`

- [ ] **Step 1: Add a failing orchestration test**

Extend test fixtures to provide `phone` and `tablet` in both metadata and machine config. Run with `devices: ["tablet"]`, `runMode: "all"`, and assert:

```ts
assert.deepEqual(result.runs.swe?.devices.map((device) => device.id), [
  "tablet",
]);
assert.deepEqual(result.runs.answer?.devices.map((device) => device.id), [
  "tablet",
]);
```

The fake command executor must report both configured targets from `list targets` and successful `aa test` output.

- [ ] **Step 2: Run the orchestration test and verify RED**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test --test-name-pattern="filters both swe and answer" tests/case-runner.test.ts`

Expected: FAIL because `runCaseComparisons` does not pass `input.devices` to selection.

- [ ] **Step 3: Forward the parsed devices**

```ts
const deviceSelection = buildCaseDeviceSelection(
  context.metadata,
  matrixConfig,
  input.devices,
);
```

- [ ] **Step 4: Run the case runner tests and verify GREEN**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test tests/case-runner.test.ts`

Expected: all case runner tests pass.

### Task 4: Document and release version 0.1.2

**Files:**
- Modify: `harmonyos-ohostest-runner/README.md`
- Modify: `harmonyos-ohostest-runner/docs/usage/case.md`
- Modify: `harmonyos-ohostest-runner/package.json`
- Modify: `harmonyos-ohostest-runner/CHANGELOG.md`

- [ ] **Step 1: Update user documentation**

Add `--device <id>` to case parameters, state that it may repeat, provide `phone` and `tablet` examples, and explain that IDs must belong to the case-approved set. Keep the statement that `--test-class` is unsupported.

- [ ] **Step 2: Bump and record the release**

Set `package.json` version to `0.1.2`. Add this changelog section above `0.1.1`:

```md
## [0.1.2] - 2026-07-16

### 新增

- case 模式支持可重复的 `--device <id>` 参数，可只执行 case 配置允许的指定设备，例如 `phone` 或 `tablet`。
- 指定不属于 case 设备集合的 ID 时，在执行设备矩阵前返回明确错误。
```

- [ ] **Step 3: Format changed source and tests**

Run: `cd harmonyos-ohostest-runner && npx prettier --write src/cli/parseCaseArgs.ts src/case/types/index.ts src/case/config.ts src/case/runner.ts tests/cli.test.ts tests/case-config.test.ts tests/case-runner.test.ts package.json`

Expected: Prettier exits 0.

### Task 5: Full verification

**Files:**
- Verify all files changed in Tasks 1-4.

- [ ] **Step 1: Run all unit tests**

Run: `cd harmonyos-ohostest-runner && npm test`

Expected: exit 0 with no failing tests.

- [ ] **Step 2: Run the TypeScript build**

Run: `cd harmonyos-ohostest-runner && npm run build`

Expected: exit 0 with no TypeScript diagnostics.

- [ ] **Step 3: Run lint**

Run: `cd harmonyos-ohostest-runner && npm run lint`

Expected: exit 0 with no ESLint errors.

- [ ] **Step 4: Check release metadata and diff hygiene**

Run: `rg -n '0\.1\.2|--device' harmonyos-ohostest-runner/package.json harmonyos-ohostest-runner/CHANGELOG.md harmonyos-ohostest-runner/README.md harmonyos-ohostest-runner/docs/usage/case.md && git diff --check`

Expected: all four files contain the intended release/device documentation and `git diff --check` prints no errors.

- [ ] **Step 5: Commit the implementation**

```bash
git add docs/superpowers/specs/2026-07-16-case-device-filter-design.md \
  docs/superpowers/plans/2026-07-16-case-device-filter.md \
  harmonyos-ohostest-runner/src/cli/parseCaseArgs.ts \
  harmonyos-ohostest-runner/src/case/types/index.ts \
  harmonyos-ohostest-runner/src/case/config.ts \
  harmonyos-ohostest-runner/src/case/runner.ts \
  harmonyos-ohostest-runner/tests/cli.test.ts \
  harmonyos-ohostest-runner/tests/case-config.test.ts \
  harmonyos-ohostest-runner/tests/case-runner.test.ts \
  harmonyos-ohostest-runner/README.md \
  harmonyos-ohostest-runner/docs/usage/case.md \
  harmonyos-ohostest-runner/package.json \
  harmonyos-ohostest-runner/CHANGELOG.md
git commit -m "feat: filter case runs by device"
```

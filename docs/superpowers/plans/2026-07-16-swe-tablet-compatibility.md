# SWE Tablet Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Temporarily add `tablet` to the entry module's `module.deviceTypes` while a case-mode SWE tablet matrix runs, restore the original file before Answer, and document the verified fix in the current `0.1.2` changelog.

**Architecture:** Add a case-scoped wrapper that discovers the entry module, validates and temporarily rewrites its main `module.json5`, executes a callback, and restores the exact original content in `finally`. The case runner enables the wrapper only for SWE selections containing device ID `tablet`; Answer and the matrix runner remain unchanged.

**Tech Stack:** TypeScript 6, Node.js filesystem APIs and test runner, existing `parseJson5ish`, ESLint, Prettier, npm.

---

## File map

- `harmonyos-ohostest-runner/src/matrix/utils/projectDiscovery.ts`: export the existing entry-module selector and path normalizer for reuse.
- `harmonyos-ohostest-runner/tests/device-compatibility.test.ts`: unit tests for temporary injection, no-op paths, validation, exception restoration, and restore failure.
- `harmonyos-ohostest-runner/src/case/deviceCompatibility.ts`: isolated temporary module-config wrapper.
- `harmonyos-ohostest-runner/tests/case-runner.test.ts`: orchestration tests for SWE/tablet, SWE/phone, Answer-only, and `all` restoration order.
- `harmonyos-ohostest-runner/src/case/runner.ts`: wrap only SWE matrix execution.
- `harmonyos-ohostest-runner/CHANGELOG.md`: after verification, append the compatibility-mode fix to the current `0.1.2` entry.

### Task 1: Reuse entry-module discovery

**Files:**
- Modify: `harmonyos-ohostest-runner/src/matrix/utils/projectDiscovery.ts`
- Test: `harmonyos-ohostest-runner/tests/device-compatibility.test.ts` in Task 2

- [ ] **Step 1: Export the existing selector and normalizer without changing behavior**

Rename and export the two existing helpers, then update `discoverProjectInfo` to call the exported names:

```ts
export interface ProjectModuleInfo {
  name?: string;
  srcPath?: string;
}

export function selectEntryModule(
  modules: ProjectModuleInfo[],
): ProjectModuleInfo {
  return (
    modules.find((item) => item.name === "entry") ??
    modules.find((item) => item.srcPath?.includes("entry")) ??
    modules[0] ??
    {}
  );
}

export function normalizeModuleSrcPath(value: string): string {
  return value.replace(/^\.\//, "");
}
```

Use `selectEntryModule(buildProfile.modules ?? [])` and `normalizeModuleSrcPath(moduleInfo.srcPath ?? moduleName)` in `discoverProjectInfo`.

- [ ] **Step 2: Verify existing project discovery tests stay green**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test tests/config.test.ts`

Expected: all existing config tests pass; this step is behavior-preserving refactoring.

### Task 2: Build the reversible SWE compatibility wrapper with TDD

**Files:**
- Create: `harmonyos-ohostest-runner/tests/device-compatibility.test.ts`
- Create: `harmonyos-ohostest-runner/src/case/deviceCompatibility.ts`

- [ ] **Step 1: Write the failing temporary-injection test**

Create a temporary project whose `build-profile.json5` points to `./products/entry` and whose entry main `module.json5` contains comments plus `deviceTypes: ["phone"]`. Test:

```ts
const original = await fs.readFile(modulePath, "utf-8");
const result = await withSweTabletCompatibility({
  project,
  enabled: true,
  run: async () => {
    const duringRun = parseJson5ish(
      await fs.readFile(modulePath, "utf-8"),
    ) as { module: { deviceTypes: string[] } };
    assert.deepEqual(duringRun.module.deviceTypes, ["phone", "tablet"]);
    return "completed";
  },
});
assert.equal(result, "completed");
assert.equal(await fs.readFile(modulePath, "utf-8"), original);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test --test-name-pattern="temporarily adds tablet" tests/device-compatibility.test.ts`

Expected: FAIL because `src/case/deviceCompatibility.ts` does not exist.

- [ ] **Step 3: Implement the minimal wrapper**

Create `deviceCompatibility.ts` with:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import {
  normalizeModuleSrcPath,
  selectEntryModule,
  type ProjectModuleInfo,
} from "../matrix/utils/projectDiscovery.js";
import { parseJson5ish } from "../matrix/utils/json5ish.js";

interface BuildProfile {
  modules?: ProjectModuleInfo[];
}

interface MainModuleConfig {
  module?: { deviceTypes?: unknown };
}

export async function withSweTabletCompatibility<T>(input: {
  project: string;
  enabled: boolean;
  run: () => Promise<T>;
}): Promise<T> {
  if (!input.enabled) return input.run();

  const modulePath = await resolveEntryMainModulePath(input.project);
  const original = await readCompatibilityFile(modulePath);
  const config = readMainModuleConfig(original, modulePath);
  const deviceTypes = readDeviceTypes(config, modulePath);
  if (deviceTypes.includes("tablet")) return input.run();

  config.module!.deviceTypes = [...deviceTypes, "tablet"];
  await writeTemporaryConfig(modulePath, config);
  let runError: unknown;
  try {
    return await input.run();
  } catch (error) {
    runError = error;
    throw error;
  } finally {
    await restoreOriginalConfig(modulePath, original, runError);
  }
}
```

For this first GREEN step, implement only the happy-path private helpers needed to locate and parse the entry module, write `${JSON.stringify(config, null, 2)}\n`, and restore the exact original string. Defer descriptive validation and wrapped filesystem errors until the edge-case RED step.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test --test-name-pattern="temporarily adds tablet" tests/device-compatibility.test.ts`

Expected: PASS.

- [ ] **Step 5: Add failing edge-case tests**

Add separate tests for these behaviors:

```ts
// Already supported: preserve a commented original file byte-for-byte.
await withSweTabletCompatibility({ project, enabled: true, run });
assert.equal(await fs.readFile(modulePath, "utf-8"), originalWithTablet);

// Disabled: do not inspect a nonexistent project.
assert.equal(
  await withSweTabletCompatibility({
    project: "/missing/project",
    enabled: false,
    run: async () => "skipped",
  }),
  "skipped",
);

// Callback failure: restore, then rethrow the same Error instance.
await assert.rejects(
  withSweTabletCompatibility({ project, enabled: true, run: async () => {
    throw expectedError;
  }}),
  (error) => error === expectedError,
);
assert.equal(await fs.readFile(modulePath, "utf-8"), original);

// Invalid deviceTypes.
await assert.rejects(
  withSweTabletCompatibility({ project, enabled: true, run }),
  /swe_tablet_compatibility_invalid_module/,
);
```

For restore failure, remove the module's parent directory inside `run`, throw `run failed`, and assert the wrapper rejects with `swe_tablet_compatibility_restore_failed` containing both the module path and `run failed`.

- [ ] **Step 6: Run the edge-case tests and verify they fail for missing behavior, then complete the helpers**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test tests/device-compatibility.test.ts`

Expected before completing helpers: at least the invalid-config or restore-failure assertion fails for the intended missing behavior. Add only the validation/error wrapping required by the tests, using these stable prefixes:

- `swe_tablet_compatibility_entry_module_not_found`
- `swe_tablet_compatibility_read_failed`
- `swe_tablet_compatibility_invalid_module`
- `swe_tablet_compatibility_write_failed`
- `swe_tablet_compatibility_restore_failed`

`readDeviceTypes` must require an array containing only strings and must not create a missing field. `restoreOriginalConfig` must include the original callback error message when restoration also fails. Rerun until all tests pass.

### Task 3: Integrate the wrapper into case orchestration with TDD

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/case-runner.test.ts`
- Modify: `harmonyos-ohostest-runner/src/case/runner.ts`

- [ ] **Step 1: Extend the test fixture with an entry main module config**

In `makeProject`, create `products/entry/src/main/module.json5` with:

```ts
await fs.writeFile(
  path.join(project, "products", "entry", "src", "main", "module.json5"),
  JSON.stringify({ module: { name: "entry", deviceTypes: ["phone"] } }),
  "utf-8",
);
```

- [ ] **Step 2: Write a failing `run all` tablet lifecycle test**

Use a two-device metadata/machine fixture and select `devices: ["tablet"]`. In the fake command executor, read the work project's entry main module each time a command containing `assembleApp` runs:

```ts
const buildDeviceTypes: string[][] = [];
commandExecutor: async (command, cwd) => {
  if (command.includes("assembleApp")) {
    const config = parseJson5ish(
      await fs.readFile(
        path.join(cwd!, "products/entry/src/main/module.json5"),
        "utf-8",
      ),
    ) as { module: { deviceTypes: string[] } };
    buildDeviceTypes.push(config.module.deviceTypes);
  }
  return successfulCommandResult(command);
}
```

Assert the first SWE build sees `["phone", "tablet"]`, the second Answer build sees `["phone"]`, and `keepWorkdir: true` leaves the final file at `["phone"]`.

- [ ] **Step 3: Run the lifecycle test and verify RED**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test --test-name-pattern="temporarily enables tablet only for swe" tests/case-runner.test.ts`

Expected: FAIL because the SWE build still sees only `["phone"]`.

- [ ] **Step 4: Wrap SWE matrix execution**

Import the wrapper and change only the SWE branch:

```ts
if (runMode === "swe" || runMode === "all") {
  context.runs.swe = await withSweTabletCompatibility({
    project: context.workProject,
    enabled: deviceSelection.devices.includes("tablet"),
    run: () => runCaseMatrix(input, context, deviceSelection, "swe"),
  });
}
```

Keep golden patch application and Answer execution after the wrapper has returned.

- [ ] **Step 5: Run the lifecycle test and verify GREEN**

Run: `cd harmonyos-ohostest-runner && node --import tsx --test --test-name-pattern="temporarily enables tablet only for swe" tests/case-runner.test.ts`

Expected: PASS.

- [ ] **Step 6: Add no-op orchestration coverage**

Add focused tests or extend existing tests to assert:

- `runMode: "swe"` with selected phone builds with `["phone"]`;
- `runMode: "answer"` with selected tablet builds with `["phone"]` and never injects tablet.

Run: `cd harmonyos-ohostest-runner && node --import tsx --test tests/case-runner.test.ts`

Expected: all case runner tests pass.

### Task 4: Full implementation verification

**Files:**
- Verify every source and test file changed in Tasks 1-3.

- [ ] **Step 1: Format all changed TypeScript and test files**

Run: `cd harmonyos-ohostest-runner && npx prettier --write src/matrix/utils/projectDiscovery.ts src/case/deviceCompatibility.ts src/case/runner.ts tests/device-compatibility.test.ts tests/case-runner.test.ts`

Expected: Prettier exits 0.

- [ ] **Step 2: Run all unit tests**

Run: `cd harmonyos-ohostest-runner && npm test`

Expected: exit 0 with no failing tests.

- [ ] **Step 3: Run the TypeScript build**

Run: `cd harmonyos-ohostest-runner && npm run build`

Expected: exit 0 with no TypeScript diagnostics.

- [ ] **Step 4: Run lint**

Run: `cd harmonyos-ohostest-runner && npm run lint`

Expected: exit 0 with no ESLint errors.

- [ ] **Step 5: Check implementation diff hygiene**

Run: `git diff --check && git status --short`

Expected: diff check is silent and status lists only planned source and test files. Do not edit `CHANGELOG.md` until Steps 1-5 have passed.

### Task 5: Append the verified fix to the current changelog and commit

**Files:**
- Modify: `harmonyos-ohostest-runner/CHANGELOG.md`
- Verify every file changed in Tasks 1-4 plus the changelog.

- [ ] **Step 1: Append bullets under the existing 0.1.2 Fixes section**

Keep `package.json` at `0.1.2`. Under the existing `## [0.1.2] - 2026-07-16` → `### 修复` section, append:

```md
- case 模式在平板执行 SWE 时，临时为入口模块的 `module.deviceTypes` 增加 `tablet`，避免应用进入兼容模式而影响 UI 测试准确性。
- SWE 执行结束或异常后恢复原始 `module.json5`，确保 Answer 和 golden patch 不受临时配置影响。
```

- [ ] **Step 2: Verify version, changelog, and final diff hygiene**

Run: `rg -n '"version": "0\.1\.2"|兼容模式|恢复原始' harmonyos-ohostest-runner/package.json harmonyos-ohostest-runner/CHANGELOG.md && git diff --check && git status --short`

Expected: package version remains `0.1.2`, both changelog bullets are present, diff check is silent, and status lists only planned files.

- [ ] **Step 3: Commit the implementation**

```bash
git add harmonyos-ohostest-runner/src/matrix/utils/projectDiscovery.ts \
  harmonyos-ohostest-runner/src/case/deviceCompatibility.ts \
  harmonyos-ohostest-runner/src/case/runner.ts \
  harmonyos-ohostest-runner/tests/device-compatibility.test.ts \
  harmonyos-ohostest-runner/tests/case-runner.test.ts \
  harmonyos-ohostest-runner/CHANGELOG.md
git commit -m "fix: avoid SWE tablet compatibility mode"
```

# Runner Execution Core Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Case and Matrix sibling adapters over a neutral HarmonyOS execution core, remove `src/shared`, preserve both v1 result schemas, and validate both modes with ResponsiveRepeatLayout.

**Architecture:** Move command, project discovery, configuration, build, device, aa-test, and device-run orchestration into `src/execution`. Matrix and Case each translate their own inputs into an `ExecutionPlan`, call `runExecution`, and wrap the returned neutral result in their existing public schema. Dependency tests enforce the one-way boundary.

**Tech Stack:** TypeScript 6, Node.js test runner, tsx, ESLint, Hvigor, ohpm, HDC and HarmonyOS emulators.

---

## File Structure

New or renamed execution files:

- `src/execution/types/index.ts`: command, configuration, plan, build, device, suite, test-case, and neutral execution result types.
- `src/execution/command.ts`: command executors, detached commands, decoding, and logging.
- `src/execution/config.ts`: machine configuration and project-derived execution configuration.
- `src/execution/plan.ts`: common device selection and suite-plan helpers.
- `src/execution/build.ts`: HarmonyOS build and artifact discovery.
- `src/execution/device.ts`: emulator, HDC preparation, installation, and device logs.
- `src/execution/ohostest.ts`: aa-test commands and output parsing.
- `src/execution/runner.ts`: build plus selected-device execution, returning `ExecutionResult`.
- `src/execution/result.ts`: reusable execution status and count aggregation.
- `src/execution/project/json5ish.ts`: JSON5-ish parser.
- `src/execution/project/discovery.ts`: HarmonyOS module and artifact discovery.
- `src/execution/utils/*.ts`: execution-owned file, naming, quoting, and timing helpers.

Mode files:

- `src/matrix/runner.ts`: load config, build Matrix plan, call execution, wrap and write Matrix artifacts.
- `src/matrix/result.ts`: Matrix-only summary rendering.
- `src/matrix/types/index.ts`: public Matrix input/result adapter types and compatibility type exports.
- `src/case/runner.ts`: Case workspace and patch sequencing, plan creation, neutral execution calls, and Case artifacts.
- `src/case/config.ts`: Case metadata and Case-specific execution-plan policy.
- `src/case/result.ts`: Case-only classification, comparison, and summary.
- `src/case/types/index.ts`: Case input/result types based on `ExecutionResult`.
- `src/case/deviceCompatibility.ts`: Case-only temporary mutation using execution project utilities.
- `src/case/patch.ts`: Case-only patch application using execution command types.
- `src/fold/server.ts`: Fold behavior depending on execution device types.

Tests:

- `tests/dependency-boundaries.test.ts`: source dependency rules.
- `tests/execution-plan.test.ts`: common selection and suite-plan behavior.
- Existing config, command, build, device, ohostest, result, runner, and Case tests migrate imports and remain behavior tests.
- `tests/case-runner.test.ts`: injected executor coverage for patch commands and v1 Case schema.
- `tests/runner.test.ts`: v1 Matrix schema and adapter behavior.

### Task 1: Protect Dependency Boundaries

**Files:**
- Create: `harmonyos-ohostest-runner/tests/dependency-boundaries.test.ts`

- [ ] **Step 1: Write the failing dependency test**

Create a test that recursively reads `src/case`, `src/matrix`, and the future
`src/execution` directories, extracts relative imports, and asserts:

```ts
assert.deepEqual(importsAcross("src/case", "matrix"), []);
assert.deepEqual(importsAcross("src/matrix", "case"), []);
assert.deepEqual(importsAcross("src/execution", "case"), []);
assert.deepEqual(importsAcross("src/execution", "matrix"), []);
```

The helper must return source file plus import path so a failure identifies the
offending import.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- tests/dependency-boundaries.test.ts
```

Expected: FAIL listing the existing Case imports from Matrix. Missing
`src/execution` is treated as an empty source directory rather than a test
setup error.

- [ ] **Step 3: Commit the red test**

```bash
git add harmonyos-ohostest-runner/tests/dependency-boundaries.test.ts
git commit -m "test: protect runner mode boundaries"
```

### Task 2: Establish Neutral Execution Types and Utilities

**Files:**
- Create: `harmonyos-ohostest-runner/src/execution/types/index.ts`
- Move: `harmonyos-ohostest-runner/src/shared/command.ts` to `harmonyos-ohostest-runner/src/execution/command.ts`
- Move: `harmonyos-ohostest-runner/src/shared/utils/file.ts` to `harmonyos-ohostest-runner/src/execution/utils/file.ts`
- Move: `harmonyos-ohostest-runner/src/shared/utils/names.ts` to `harmonyos-ohostest-runner/src/execution/utils/names.ts`
- Move: `harmonyos-ohostest-runner/src/shared/utils/shellQuote.ts` to `harmonyos-ohostest-runner/src/execution/utils/shellQuote.ts`
- Move: `harmonyos-ohostest-runner/src/shared/utils/sleep.ts` to `harmonyos-ohostest-runner/src/execution/utils/sleep.ts`
- Modify: `harmonyos-ohostest-runner/tests/command.test.ts`
- Modify: imports in production and test files that consume these primitives

- [ ] **Step 1: Add a failing type/build expectation**

Change `tests/command.test.ts` to import from `src/execution/command.ts` and add
an import of `CommandExecutor` from `src/execution/types/index.ts`.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
node --import tsx --test tests/command.test.ts
```

Expected: FAIL because execution modules do not exist.

- [ ] **Step 3: Move command/util implementations and define neutral types**

Move the implementations without behavior changes. Define neutral names:

```ts
export interface ExecutionPlan {
  devices: ExecutionDevicePlan[];
  testClass?: string;
}

export interface ExecutionResult {
  project: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  build: BuildResult;
  devices: DeviceRunResult[];
  diagnostics: string[];
}
```

Move all existing build/device/suite/test-case types from Matrix types into this
file. Matrix types temporarily re-export neutral types required by documented
consumers.

- [ ] **Step 4: Update imports and verify GREEN**

Run:

```bash
node --import tsx --test tests/command.test.ts
npm run build
```

Expected: command tests and TypeScript build pass.

- [ ] **Step 5: Commit**

```bash
git add harmonyos-ohostest-runner/src harmonyos-ohostest-runner/tests/command.test.ts
git commit -m "refactor: establish execution primitives"
```

### Task 3: Move Project Discovery, Configuration, Build, Device, and aa-test

**Files:**
- Move: `src/matrix/utils/json5ish.ts` to `src/execution/project/json5ish.ts`
- Move: `src/matrix/utils/projectDiscovery.ts` to `src/execution/project/discovery.ts`
- Move: `src/matrix/config.ts` to `src/execution/config.ts`
- Move: `src/matrix/build.ts` to `src/execution/build.ts`
- Move: `src/matrix/device.ts` to `src/execution/device.ts`
- Move: `src/matrix/ohostest.ts` to `src/execution/ohostest.ts`
- Modify: associated test imports
- Modify: `src/case/deviceCompatibility.ts`
- Modify: `src/case/config.ts`
- Modify: `src/fold/server.ts`

- [ ] **Step 1: Change focused test imports to neutral paths**

Update `json5ish.test.ts`, `project-discovery.test.ts`, `config.test.ts`,
`build.test.ts`, `device.test.ts`, and `ohostest.test.ts` to import execution
modules. Add a type assertion that `loadExecutionConfig()` returns
`ExecutionConfig`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --import tsx --test \
  tests/json5ish.test.ts \
  tests/project-discovery.test.ts \
  tests/config.test.ts \
  tests/build.test.ts \
  tests/device.test.ts \
  tests/ohostest.test.ts
```

Expected: FAIL on missing execution module imports.

- [ ] **Step 3: Move implementations and rename MatrixConfig**

Rename `loadMatrixConfig` to `loadExecutionConfig`,
`LoadMatrixConfigInput` to `LoadExecutionConfigInput`, and `MatrixConfig` to
`ExecutionConfig`. Remove Case-only suite override fields from the loader.
Parsing retains machine `testSuites` on device configuration so adapters can
later build plans.

- [ ] **Step 4: Update Case compatibility and Fold imports**

Case tablet compatibility imports discovery/JSON5 from execution. Case timeout
uses `AA_TEST_CASE_TIMEOUT_MS` from execution. Fold imports `DeviceConfig` from
execution types.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 2 command plus:

```bash
npm run build
```

Expected: all focused tests and TypeScript build pass.

- [ ] **Step 6: Commit**

```bash
git add harmonyos-ohostest-runner/src harmonyos-ohostest-runner/tests
git commit -m "refactor: move HarmonyOS operations into execution"
```

### Task 4: Introduce Explicit Execution Plans

**Files:**
- Create: `harmonyos-ohostest-runner/src/execution/plan.ts`
- Create: `harmonyos-ohostest-runner/tests/execution-plan.test.ts`
- Modify: `harmonyos-ohostest-runner/src/case/config.ts`
- Modify: `harmonyos-ohostest-runner/tests/case-config.test.ts`

- [ ] **Step 1: Write failing plan tests**

Cover:

```ts
selectExecutionDevices(config.devices, ["tablet", "phone"])
// preserves requested order and rejects unknown IDs

buildExecutionPlan({
  devices,
  suitesByDevice: { phone: ["A", "A", "B"] },
})
// produces A, B once

buildExecutionPlan({ devices, runAllTests: true })
// has no testClasses override
```

Also assert Case metadata restricts devices and converts metadata suites into
the same plan type.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
node --import tsx --test tests/execution-plan.test.ts tests/case-config.test.ts
```

Expected: FAIL because plan helpers do not exist and Case returns its old
selection shape.

- [ ] **Step 3: Implement plan helpers and Case adapter**

Implement deterministic selection, deduplication, descriptive unknown-device
errors, suite override application, and run-all behavior. Replace
`CaseDeviceSelection` with `ExecutionPlan` or a Case wrapper containing one.

- [ ] **Step 4: Run and verify GREEN**

Run the Step 2 command.

Expected: all plan and Case config tests pass.

- [ ] **Step 5: Commit**

```bash
git add harmonyos-ohostest-runner/src/execution/plan.ts \
  harmonyos-ohostest-runner/src/case/config.ts \
  harmonyos-ohostest-runner/src/case/types/index.ts \
  harmonyos-ohostest-runner/tests/execution-plan.test.ts \
  harmonyos-ohostest-runner/tests/case-config.test.ts
git commit -m "refactor: separate execution planning from modes"
```

### Task 5: Extract the Neutral Execution Runner

**Files:**
- Create: `harmonyos-ohostest-runner/src/execution/runner.ts`
- Create: `harmonyos-ohostest-runner/src/execution/result.ts`
- Modify: `harmonyos-ohostest-runner/tests/runner.test.ts`
- Modify: `harmonyos-ohostest-runner/tests/result.test.ts`

- [ ] **Step 1: Add failing neutral runner tests**

Import and call:

```ts
runExecution({
  config,
  plan,
  outDir,
  skipBuild,
  keepEmulators,
  commandSession,
})
```

Assert it returns neutral timing, build, devices, status, and diagnostics but
does not contain `schemaVersion`, Matrix summary, or Matrix artifact fields.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
node --import tsx --test tests/runner.test.ts tests/result.test.ts
```

Expected: FAIL because `runExecution` and neutral result helpers do not exist.

- [ ] **Step 3: Move execution orchestration out of Matrix**

Move build, Fold trigger, selected-device sequencing, emulator cooldown,
device lifecycle, suite execution, aa-test parsing, blocking reasons, and
aggregation into execution. The runner consumes `ExecutionPlan` and returns
`ExecutionResult`.

- [ ] **Step 4: Run and verify GREEN**

Run the Step 2 command plus `npm run build`.

Expected: execution tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add harmonyos-ohostest-runner/src/execution \
  harmonyos-ohostest-runner/tests/runner.test.ts \
  harmonyos-ohostest-runner/tests/result.test.ts
git commit -m "refactor: extract neutral HarmonyOS execution runner"
```

### Task 6: Rebuild the Matrix Adapter

**Files:**
- Modify: `harmonyos-ohostest-runner/src/matrix/runner.ts`
- Modify: `harmonyos-ohostest-runner/src/matrix/result.ts`
- Modify: `harmonyos-ohostest-runner/src/matrix/types/index.ts`
- Modify: `harmonyos-ohostest-runner/tests/runner.test.ts`
- Modify: `harmonyos-ohostest-runner/tests/cli.test.ts`

- [ ] **Step 1: Add failing Matrix adapter assertions**

Assert `runOhosTestMatrix` loads config, creates a plan, calls execution, writes
`commands.log`, `summary.md`, and the existing `ohostest-matrix-v1` result.
Assert an unknown requested device produces a descriptive error.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
node --import tsx --test tests/runner.test.ts tests/cli.test.ts
```

Expected: adapter/schema tests fail while Matrix still contains old execution
or silently filters an unknown device.

- [ ] **Step 3: Implement the thin adapter**

Keep Matrix input and result construction in Matrix. Remove
`deviceSuiteOverrides` and `ignoreMachineDeviceSuites` from the public Matrix
input. Delegate all project execution to `runExecution`.

- [ ] **Step 4: Run and verify GREEN**

Run the Step 2 command plus `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add harmonyos-ohostest-runner/src/matrix \
  harmonyos-ohostest-runner/tests/runner.test.ts \
  harmonyos-ohostest-runner/tests/cli.test.ts
git commit -m "refactor: make matrix a thin execution adapter"
```

### Task 7: Migrate Case to the Neutral Runner

**Files:**
- Modify: `harmonyos-ohostest-runner/src/case/runner.ts`
- Modify: `harmonyos-ohostest-runner/src/case/result.ts`
- Modify: `harmonyos-ohostest-runner/src/case/types/index.ts`
- Modify: `harmonyos-ohostest-runner/src/case/patch.ts`
- Modify: `harmonyos-ohostest-runner/tests/case-runner.test.ts`
- Modify: `harmonyos-ohostest-runner/tests/case-result.test.ts`

- [ ] **Step 1: Write failing Case executor and schema tests**

Use an injected executor that records patch, build, HDC, and aa-test commands.
Assert patch check/apply commands appear in the injected command list. Assert
SWE and answer are neutral execution results while serialized Case output
retains `ohostest-case-v1` and its existing nested fields.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
node --import tsx --test tests/case-runner.test.ts tests/case-result.test.ts
```

Expected: FAIL because patch commands currently bypass the injected executor
and Case still imports Matrix result types/runner.

- [ ] **Step 3: Implement Case execution calls**

Case loads neutral config, builds its plan, and calls `runExecution` for SWE
and answer. Apply the injected command executor to patch commands. Preserve
tablet compatibility, cleanup, diagnostics, result shape, and summaries.
Expose root plus phase logs accurately in artifacts without removing existing
artifact keys.

- [ ] **Step 4: Run and verify GREEN**

Run the Step 2 command plus `npm run build`.

Expected: Case tests and build pass.

- [ ] **Step 5: Run dependency boundary test**

Run:

```bash
node --import tsx --test tests/dependency-boundaries.test.ts
```

Expected: PASS with no Case-to-Matrix import.

- [ ] **Step 6: Commit**

```bash
git add harmonyos-ohostest-runner/src/case \
  harmonyos-ohostest-runner/tests/case-runner.test.ts \
  harmonyos-ohostest-runner/tests/case-result.test.ts
git commit -m "refactor: run cases through execution core"
```

### Task 8: Remove Compatibility Debris and Verify Automated Checks

**Files:**
- Delete: `harmonyos-ohostest-runner/src/shared/**`
- Delete: superseded Matrix implementation files and utilities
- Modify: remaining source/test imports
- Modify: `harmonyos-ohostest-runner/src/index.ts` if neutral public type exports are needed

- [ ] **Step 1: Search for forbidden and stale imports**

Run:

```bash
rg -n 'src/shared|/shared|\\.\\./matrix|\\.\\./case' src tests
```

Expected before cleanup: any compatibility imports are listed.

- [ ] **Step 2: Remove stale modules and imports**

Delete empty/superseded directories and point every remaining execution-domain
import at `execution`.

- [ ] **Step 3: Run formatting**

Run:

```bash
npx prettier --write "src/**/*.ts" "tests/**/*.ts"
```

- [ ] **Step 4: Run complete automated verification**

Run:

```bash
npm test
npm run build
npm run lint
git diff --check
```

Expected: zero failed tests, TypeScript exit 0, ESLint exit 0, and no whitespace
errors.

- [ ] **Step 5: Commit**

```bash
git add harmonyos-ohostest-runner/src harmonyos-ohostest-runner/tests
git commit -m "refactor: finish execution core migration"
```

### Task 9: Validate ResponsiveRepeatLayout Matrix and Case Modes

**Files:**
- Do not modify fixture source or user machine configuration.
- Generate ignored run artifacts under explicit `.ohostest-runs` directories.

- [ ] **Step 1: Perform the required environment checks**

Run and record:

```bash
java -version
node -v
ohpm -v
hvigorw -v
node -e "console.log(process.env.DEVECO_SDK_HOME || 'NOT SET')"
```

If the standalone `hvigorw` is unavailable, use the exact wrapper path already
configured in `config/machine.json` and report that substitution.

- [ ] **Step 2: Inspect emulator targets**

Run the configured HDC binary with `list targets`. Record which configured
phone, foldable, and tablet targets are connected before execution.

- [ ] **Step 3: Run Matrix against answer**

From `harmonyos-ohostest-runner`, run:

```bash
npm run ohostest:matrix -- \
  --project ../ResponsiveRepeatLayout/answer \
  --config config/machine.json \
  --out ../ResponsiveRepeatLayout/answer/.ohostest-runs/refactor-matrix/result.json
```

Expected: the command completes with a written Matrix v1 result. The actual
status may be completed or failed depending on emulator/environment state and
must be reported from the result rather than inferred from process exit alone.

- [ ] **Step 4: Run Case against case fixture**

Run:

```bash
npm run ohostest:case -- \
  --case ../ResponsiveRepeatLayout/case \
  --config config/machine.json \
  --run answer \
  --out ../ResponsiveRepeatLayout/case/.ohostest-runs/refactor-case
```

Expected: the command writes a Case v1 result, summary, and logs. Report its
actual Case and per-device status.

- [ ] **Step 5: Inspect artifacts**

Read both result JSON files, summaries, command logs, and device logs. Confirm
schema versions, selected devices, build status, test counts, and any blocked
reason.

- [ ] **Step 6: Run fresh final verification**

Immediately before completion, rerun:

```bash
npm test
npm run build
npm run lint
git status --short --branch
```

Report exact test counts, exit codes, real-run artifact paths, user-owned
uncommitted files, and any environment blocker.

- [ ] **Step 7: Commit validation documentation only if repository policy requires it**

Generated run artifacts remain ignored and uncommitted. If no tracked file
changes are needed, do not create an empty validation commit.

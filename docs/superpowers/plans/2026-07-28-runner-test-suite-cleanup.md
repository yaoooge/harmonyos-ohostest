# Runner Test Suite Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce implementation-bound and existence-only runner tests while preserving all functional contracts, failure isolation, platform compatibility, and resource-safety coverage.

**Architecture:** Modify test files only. Consolidate related scenarios into table-driven tests, move execution-plan policy out of expensive runner fixtures, and remove duplicate assertions already protected by focused lower-level tests.

**Tech Stack:** TypeScript, Node.js test runner, tsx, ESLint, TypeScript compiler.

---

### Task 1: Record Baseline and Clean Fold/Result Tests

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/fold.test.ts`
- Modify: `harmonyos-ohostest-runner/tests/result.test.ts`

- [ ] Record `npm test` test count and duration before changes.
- [ ] Delete Fold source-text checks for the four exported function names.
- [ ] Keep port substitution, placeholder removal, different-port output,
  deployment create/overwrite, and health-check behavior.
- [ ] Replace the three Matrix status tests with one table-driven test:

```ts
for (const scenario of [
  { devices: [device("passed", "phone")], expected: "completed" },
  { devices: [device("failed", "phone")], expected: "completed" },
  { devices: [device("blocked", "phone")], expected: "failed" },
  { devices: [], expected: "failed" },
]) {
  assert.equal(deriveMatrixStatus(scenario.devices), scenario.expected);
}
```

- [ ] Merge the two Markdown tests into one summary contract covering the
  device row, suite row, Fold port, and test-case rows.
- [ ] Run:

```bash
node --import tsx --test tests/fold.test.ts tests/result.test.ts
```

Expected: all focused tests pass.

### Task 2: Separate Execution Plan Policy from Runner Integration

**Files:**
- Create: `harmonyos-ohostest-runner/tests/execution-plan.test.ts`
- Modify: `harmonyos-ohostest-runner/tests/config.test.ts`
- Modify: `harmonyos-ohostest-runner/tests/runner.test.ts`

- [ ] Move suite override and run-all plan assertions from `config.test.ts` to
  `execution-plan.test.ts`.
- [ ] Add requested-order and unknown-device plan cases:

```ts
assert.deepEqual(
  buildExecutionPlan(config, { devices: ["tablet", "phone"] })
    .devices.map((device) => device.id),
  ["tablet", "phone"],
);
assert.throws(
  () => buildExecutionPlan(config, { devices: ["missing"] }),
  /missing in machine config/,
);
```

- [ ] Add a focused `testClass` precedence assertion to the plan test.
- [ ] Delete the complete-runner `testClass` precedence test.
- [ ] Delete the configured-hvigorw runner integration test.
- [ ] Simplify the happy-path runner assertions to result status, device
  status, result/summary artifacts, and evidence that aa-test executed.
- [ ] Keep install-error short circuit, emulator cooldown, and suite
  aggregation integration tests.
- [ ] Run:

```bash
node --import tsx --test \
  tests/execution-plan.test.ts \
  tests/config.test.ts \
  tests/runner.test.ts
```

Expected: all focused tests pass.

### Task 3: Consolidate Case Runner Modes

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/case-runner.test.ts`

- [ ] Replace separate answer-only and SWE-only tests with one table-driven
  parent test using two `t.test` cases.
- [ ] Each scenario asserts selected run presence, opposite run absence,
  visible patched state, and build device types.
- [ ] Remove repeated artifact-key assertions that do not add behavior beyond
  selected run presence.
- [ ] Delete the standalone default-output-directory integration test.
- [ ] Keep full SWE+answer, enabled-device run-all, patch failure, and tablet
  compatibility tests.
- [ ] Run:

```bash
node --import tsx --test tests/case-runner.test.ts
```

Expected: all focused tests and both table subtests pass.

### Task 4: Consolidate Tablet Compatibility Tests

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/device-compatibility.test.ts`

- [ ] Keep the successful temporary tablet addition/restoration test.
- [ ] Combine already-compatible and disabled no-op behavior under one parent
  test with two subtests.
- [ ] Keep callback failure rethrow and byte restoration.
- [ ] Combine invalid `deviceTypes` and invalid module list as table subtests.
- [ ] Delete the combined callback-failure/restoration-failure error-string
  test.
- [ ] Run:

```bash
node --import tsx --test tests/device-compatibility.test.ts
```

Expected: all focused tests and table subtests pass.

### Task 5: Relax Successful Build Process Assertions

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/build.test.ts`

- [ ] Change the successful-build test from exact array positions to command
  category assertions:

```ts
assert.ok(commands.some((command) => command.includes(" clean ")));
assert.ok(commands.some((command) => command.includes("ohpm install")));
assert.ok(commands.some((command) => command.includes("assembleApp")));
assert.ok(commands.some((command) => command.includes("ohosTest@PackageHap")));
```

- [ ] Keep exact single-command assertion for clean failure short circuit.
- [ ] Keep signed/unsigned HSP, missing HSP, and ambiguous HSP tests.
- [ ] Run:

```bash
node --import tsx --test tests/build.test.ts
```

Expected: all build tests pass.

### Task 6: Verify Coverage Constraints and Commit

**Files:**
- Modify only files under `harmonyos-ohostest-runner/tests`

- [ ] Confirm no production source changed:

```bash
git diff --name-only HEAD -- harmonyos-ohostest-runner/src
```

Expected: no output.

- [ ] Confirm critical tests still exist with `rg` for build failure, install
  failure, emulator cooldown, tablet restoration, HSP installation, malformed
  aa-test output, unknown devices, and dependency boundaries.
- [ ] Format changed tests only with Prettier.
- [ ] Run fresh complete verification:

```bash
npm test
npm run build
npm run lint
git diff --check
```

Expected: all commands exit zero.

- [ ] Compare before/after counts and durations and summarize removed,
  consolidated, and added scenarios.
- [ ] Stage only the plan and test files; keep
  `harmonyos-ohostest-runner/config/machine.json` unstaged.
- [ ] Commit:

```bash
git commit -m "test: focus runner suite on behavior"
```

# Runner Test Suite Cleanup Design

## Problem

The runner test suite contains 103 passing tests after the execution-core
refactor. It protects important HarmonyOS behavior, but several tests duplicate
coverage across layers or assert internal command order, exported source text,
and artifact-field existence rather than externally observable behavior.

These tests increase maintenance cost during refactoring because harmless
implementation changes require broad assertion updates. The cleanup must not
trade away coverage of failure isolation, resource cleanup, platform-specific
behavior, or public result contracts.

## Goals

- Remove low-value existence checks and duplicated integration assertions.
- Replace implementation-step assertions with observable behavior where
  practical.
- Consolidate closely related cases into table-driven or complete contract
  tests.
- Preserve tests for public inputs, outputs, schemas, artifacts, failure
  behavior, and resource safety.
- Keep Case-to-Matrix and Execution-to-mode dependency boundaries protected.
- Reduce the suite from 103 tests to approximately 80–90 without changing
  production behavior.
- Keep the complete suite, TypeScript build, and ESLint checks green.

## Non-goals

- Maximize deletion count.
- Change runner production behavior.
- Replace focused assertions with broad snapshots.
- Add ResponsiveRepeatLayout device runs to the unit-test suite.
- Remove platform-specific Windows, HDC, emulator, Fold, or HSP coverage.

## Classification

### Functional contract tests

These exercise public or externally observable behavior and remain:

- CLI and configuration input conversion and validation.
- Matrix and Case result status, schema, counts, and artifacts.
- Case SWE/answer selection and metadata-driven suite planning.
- aa-test command protocol and output parsing.
- HAP/HSP discovery and install outcomes.
- Fold trigger deployment and health checks.
- Project discovery and JSON5-ish parsing.

### Critical process tests

Process assertions remain when order or cleanup is itself a requirement:

- A build failure stops later build commands.
- HSPs install before app/test HAPs.
- Installation failure prevents aa-test execution.
- One emulator disconnects and cools down before another starts.
- Temporary tablet compatibility is restored after success or failure.
- Device polling waits for connection or disconnection.

### Implementation-bound tests

These are rewritten or removed:

- Exact command array positions for a successful build.
- Runner integration assertions that repeat build/device unit assertions.
- Exact internal artifact-field presence repeated in every Case run-mode test.
- Exact diagnostic formatting beyond the public reason or useful summary.
- Expensive runner tests for precedence already expressible through
  `buildExecutionPlan`.

### Low-value existence tests

Tests that only search generated source text for function names are removed.
They do not prove the functions behave correctly and create churn when the
Fold trigger implementation is reorganized.

## File-by-file Changes

### `fold.test.ts`

Remove the four checks that search for `triggerFold`, `triggerRotation`,
`triggerLandscapeHover`, and `sleep` exports.

Keep:

- port substitution with no remaining placeholder;
- different ports producing different output;
- deployment creating and overwriting `FoldTrigger.ets`;
- health check failure when no server is listening.

Deployment tests assert the injected port, not a list of function names.

### `runner.test.ts`

Keep four integration scenarios:

1. Successful Matrix run writes the v1 result and summary and reports a passed
   device.
2. Installation output errors block the device and prevent aa-test.
3. Emulator sequencing includes the required cooldown.
4. Per-device suites execute separately and aggregate their results.

Remove the dedicated configured-hvigorw integration test because configuration
resolution and build command generation already cover it.

Move `testClass` precedence to `execution-plan.test.ts`, where it can be tested
without setting up a complete project and command executor.

In the happy-path test, remove exact clean/install command indexes and detailed
HSP/HAP installation patterns already covered by `build.test.ts` and
`device.test.ts`. Retain evidence that build, installation, and aa-test reached
a successful external result.

### `case-runner.test.ts`

Keep:

- the full SWE plus answer flow with patching, suite selection, timeout, result,
  and summary behavior;
- a table-driven single-mode contract covering answer-only and SWE-only;
- metadata `enabled_devices` run-all integration;
- golden-patch failure diagnostics and command log;
- temporary tablet compatibility across SWE and answer.

Remove the standalone default-output-directory test. Default-path construction
is a small path policy already exercised by Case runs and does not need a full
project execution fixture.

The table-driven mode test asserts which run exists, which patch state is
visible, and which build device types were observed. Repeated artifact-key
existence checks are reduced to the result file relevant to the selected mode.

### `device-compatibility.test.ts`

Keep:

- adding tablet during the callback and restoring bytes afterward;
- a combined no-op contract for disabled and already-compatible inputs;
- callback failure rethrow with restoration;
- a table-driven invalid-project contract.

Remove the test that combines callback failure with restoration failure. It
depends on exact error-string composition and does not represent a recoverable
runner outcome.

### `result.test.ts`

Replace three Matrix status tests with one table-driven test covering:

- passed and failed devices result in completed execution;
- any blocked device results in failed execution;
- no devices result in failed execution.

Merge the compact device table and suite/test-case Markdown tests into one
summary contract.

### `build.test.ts`

The successful build test asserts that required command categories are issued
and the result passes, without fixing each command to an array index.

Keep exact short-circuit behavior when clean fails because the absence of later
commands is functional failure isolation.

Keep unsigned/signed HSP resolution, missing output, and ambiguous output
coverage.

### `device.test.ts`

Keep installation order because HSP-before-HAP is an external platform
requirement. Keep uninstall-before-install and install-error parsing.

Keep connection/disconnection polling and Windows quoting.

### `config.test.ts` and `execution-plan.test.ts`

Move plan override and run-all tests into a focused
`execution-plan.test.ts`. Add requested-order and unknown-device behavior.

Configuration tests retain file parsing, defaults, explicit paths, machine
suites, legacy-field rejection, and invalid machine configuration.

### Other test files

CLI, command decoding, JSON5-ish, aa-test, project discovery, Case result,
Case patch, and dependency-boundary coverage remain unless a purely mechanical
duplicate is found during implementation. Any additional deletion requires the
same functional-value criteria and is recorded in the implementation summary.

## Error and Safety Coverage

The cleanup is rejected if it removes the last test for any of:

- build failure short circuit;
- install failure short circuit;
- blocked device/result status;
- temporary file restoration;
- emulator disconnect/cooldown;
- HSP install ordering;
- malformed aa-test output;
- unknown or disallowed device selection;
- dependency boundary violations.

## Verification

Before editing, record the current complete-suite count and duration.

After each file-level cleanup, run its focused tests. At completion run:

```text
npm test
npm run build
npm run lint
git diff --check
```

Report:

- tests before and after;
- removed, consolidated, and added scenarios;
- final duration;
- confirmation that production source files did not change;
- remaining user-owned uncommitted files.

## Completion Criteria

- The suite contains approximately 80–90 tests, unless preserving valuable
  scenarios justifies a higher number.
- No Fold trigger function-name existence test remains.
- Runner and Case integration tests no longer repeat lower-level command
  construction assertions.
- Critical failure and cleanup paths listed above remain covered.
- No production behavior changes.
- All automated verification commands pass.

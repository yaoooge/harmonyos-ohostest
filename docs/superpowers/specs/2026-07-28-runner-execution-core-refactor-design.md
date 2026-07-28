# Runner Execution Core Refactor Design

## Problem

The runner exposes two modes:

- Matrix runs a HarmonyOS project across selected devices and test suites.
- Case copies a base project, applies the test and golden patches, runs one or
  both project states, and evaluates fail-to-pass and pass-to-pass expectations.

The reusable HarmonyOS execution engine currently lives under `src/matrix`.
Case therefore imports Matrix configuration, runner, result types, project
discovery, JSON5 parsing, the aa-test timeout constant, and aa-test result
types. Matrix-specific input options also accept Case suite override policy.
This makes Matrix both a user-facing mode and the internal execution platform.

The separate `src/shared` directory does not form another stable abstraction.
All of its production consumers are part of the Case or Matrix execution path.
At the same time, Fold support imports `DeviceConfig` directly from Matrix.

## Goals

- Make Case and Matrix sibling adapters over one neutral execution core.
- Remove every import from `case/**` to `matrix/**`.
- Remove every import from `matrix/**` to `case/**`.
- Move the current `shared/**` implementation into focused execution
  submodules and remove the `shared` directory.
- Separate execution plans and execution results from Matrix's public input and
  output schemas.
- Preserve the existing `ohostest-matrix-v1` and `ohostest-case-v1` serialized
  result formats.
- Preserve existing CLI behavior unless correcting an explicitly covered
  inconsistency.
- Make command execution and command logs consistent across Case patch and
  project execution phases.
- Validate both modes against the ResponsiveRepeatLayout fixture after unit,
  type, lint, and build checks pass.

## Non-goals

- Change patch contents or Case verdict semantics.
- Change HarmonyOS build, install, emulator, Fold, or aa-test behavior.
- Add parallel device execution.
- Add retry policy or new configuration fields.
- Redesign the CLI syntax.
- Turn execution into a generic framework for unrelated command-line tasks.

## Architecture

The target dependency graph is:

```text
case   -> execution
matrix -> execution
fold   -> execution/types

case   -X-> matrix
matrix -X-> case
execution -X-> case or matrix
```

`execution` is a domain-specific HarmonyOS test execution core, not a generic
utility bucket. The old shared primitives are grouped by responsibility inside
the core:

```text
src/execution/
  command/
    executor.ts
    logger.ts
    types.ts
  project/
    discovery.ts
    json5ish.ts
  runtime/
    workspace.ts
    sleep.ts
  utils/
    file.ts
    names.ts
    shellQuote.ts
  build.ts
  config.ts
  device.ts
  ohostest.ts
  plan.ts
  result.ts
  runner.ts
  types.ts
```

The exact file split may be kept smaller where a file would contain only a
trivial re-export. The required property is ownership: every item in
`execution` must support HarmonyOS execution, while mode-specific policy stays
in Case or Matrix.

## Execution Types

`ExecutionConfig` contains resolved project, module, artifact, tool, timeout,
and device configuration. It replaces `MatrixConfig` as the type consumed by
build and device operations.

`ExecutionPlan` contains the already selected devices and suite classes:

```ts
interface ExecutionDevicePlan {
  device: DeviceConfig;
  testClasses?: string[];
}

interface ExecutionPlan {
  devices: ExecutionDevicePlan[];
  testClass?: string;
}
```

Matrix builds a plan from machine configuration and CLI filters. Case builds a
plan from machine configuration, metadata, and CLI filters. The execution
runner does not accept Case-only flags such as `deviceSuiteOverrides` or
`ignoreMachineDeviceSuites`.

`ExecutionResult` owns the reusable build, device, suite, test-case, timing,
status, and diagnostic data. Matrix wraps it with the Matrix schema and
artifacts. Case stores an execution result for each SWE or answer phase and
uses it for comparison reporting.

During migration, output constructors retain the current serialized fields so
existing result consumers do not observe a schema change.

## Configuration and Planning

Machine configuration parsing and HarmonyOS project discovery move into
`execution`. Parsing returns the neutral `ExecutionConfig`.

Suite policy is applied after parsing:

- Matrix takes suite classes from the selected machine devices, with the
  existing top-level `testClass` override.
- Case validates metadata devices against the machine configuration, applies
  metadata suite lists when present, and ignores machine suite lists when the
  metadata means "run all tests."

Shared selection logic deduplicates requested devices and rejects unknown
device identifiers. This deliberately replaces Matrix's current silent
filtering of unknown identifiers with a descriptive validation error.

## Runner Data Flow

Matrix performs:

```text
parse Matrix input
  -> load ExecutionConfig
  -> build Matrix ExecutionPlan
  -> runExecution
  -> wrap MatrixResult
  -> write Matrix summary/result
```

Case performs:

```text
load Case metadata
  -> create work project
  -> apply test patch
  -> load ExecutionConfig and build Case ExecutionPlan
  -> optionally run SWE execution
  -> apply golden patch
  -> optionally reload project-derived configuration
  -> run answer execution
  -> evaluate Case expectations
  -> write Case summary/result
  -> clean work project
```

Configuration that depends on project contents is reloaded after patching when
required for correctness. Machine-only configuration may be reused.

## Command Execution and Logs

One command-session abstraction combines an executor, working directory, and
logger. Both ordinary and detached commands are logged through it.

`RunCaseInput.commandExecutor` applies consistently to patch, build, install,
device preparation, and aa-test commands. If detached emulator commands cannot
use the injected executor without changing current behavior, the session
exposes a separately injectable detached executor while retaining the current
default.

Case artifacts explicitly identify the root patch log and phase execution
logs, or aggregate all commands into the root log. The chosen implementation
must ensure that `CaseResult.artifacts.commandLog` is not presented as the only
complete log while silently excluding SWE and answer execution commands.

## Mode Ownership

Case retains:

- metadata parsing and validation;
- base-project copying and patch application;
- SWE and answer sequencing;
- temporary SWE tablet compatibility;
- fail-to-pass and pass-to-pass classification;
- Case status, verdict, summary, and schema.

Matrix retains:

- Matrix CLI and public input adaptation;
- Matrix result schema and artifact wrapper;
- Matrix summary rendering.

Execution owns:

- command execution and logging primitives;
- HarmonyOS project and JSON5 discovery;
- machine and tool configuration;
- build and artifact verification;
- emulator/device preparation and cleanup;
- Fold-device execution hooks;
- HAP/HSP installation;
- aa-test command construction and parsing;
- device/suite execution and reusable result types;
- reusable count aggregation.

## Error Handling

Execution returns blocked build or device results for the same recoverable
conditions as today. Unexpected setup errors continue to reject the execution
call unless the owning mode currently converts them into diagnostics.

Case continues converting comparison-stage failures into Case diagnostics and
still attempts to write its result and summary. Work-directory cleanup failures
remain diagnostics and trigger a rewritten result artifact.

Unknown requested devices become validation errors in both modes. Public error
strings that are already asserted in tests are preserved unless a new test
documents an intentional improvement.

## Compatibility

The public exports `runOhosTestMatrix`, `runOhosTestCase`, `RunMatrixInput`,
`RunCaseInput`, `MatrixResult`, and `CaseResult` remain available from
`src/index.ts`.

Temporary compatibility re-exports may be added at old internal paths while
tests migrate. They are removed before completion unless an old path is part of
the package's documented public API.

The existing uncommitted `harmonyos-ohostest-runner/config/machine.json`
changes belong to the user. They are preserved and excluded from refactor
commits.

## Testing

Implementation follows red-green-refactor cycles.

Automated coverage includes:

1. A dependency-boundary test that rejects Case-to-Matrix,
   Matrix-to-Case, and mode imports from Execution.
2. Plan tests for device filtering, unknown devices, suite overrides, run-all
   behavior, and top-level test class precedence.
3. Execution runner tests for build blocking, selected device sequencing,
   emulator cleanup, install failures, aa-test parsing, and result aggregation.
4. Case runner tests proving both SWE and answer call the neutral execution
   API and preserve Case result semantics.
5. A command-executor test proving Case patch commands use the injected
   executor.
6. Schema/fixture assertions protecting both v1 result shapes.
7. The complete runner test, TypeScript build, and lint commands.

## Real Validation

After environment checks for Java, Node.js, ohpm, hvigorw, and
`DEVECO_SDK_HOME`:

- Run Matrix mode against `ResponsiveRepeatLayout/answer`.
- Run Case mode against `ResponsiveRepeatLayout/case`.
- Use the existing user-edited machine configuration for phone, foldable, and
  tablet selection.
- Preserve result JSON, summary Markdown, command logs, device logs, and exit
  codes.
- Report per-device build/test status and any unavailable emulator or
  environment blocker without representing a blocked run as success.

## Completion Criteria

- No production or test import from `case/**` to `matrix/**`.
- No import from `matrix/**` to `case/**`.
- No import from `execution/**` to either mode.
- `src/shared` no longer exists.
- Existing public exports and v1 result schemas remain compatible.
- Automated tests, TypeScript build, and lint pass.
- Both ResponsiveRepeatLayout mode commands are executed and their actual
  outcomes and artifact paths are reported.

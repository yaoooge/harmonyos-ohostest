# HarmonyOS ohosTest Matrix Runner Design Spec

## Goal

Build a new standalone tool project under `/Users/guoyutong/DevecostudioProjects/02-dev` to automate the current manual HarmonyOS multi-device `ohosTest` execution flow.

The tool only builds, installs, runs device-side tests, and collects structured test results. It must not collect DOM/component trees, take screenshots, or perform layout/rule judgment.

## Background

The current manual validation flow for `ResponsiveRepeatLayout` is:

1. Build the application HAP with `hvigorw`.
2. Build the `ohosTest` HAP.
3. Start or connect to each target device/emulator.
4. Wake/unlock the device.
5. Install the app HAP and test HAP.
6. Run `aa test` through HDC.
7. Parse `OHOS_REPORT_RESULT` / `OHOS_REPORT_CODE`.
8. Repeat the same steps for phone, foldable, and tablet targets.

The reference project `/Users/guoyutong/MyWorkSpace/one-multi-uitest-spike` already has useful standalone Node/TypeScript structure:

- CLI wrapper: `scripts/runUitestSpike.ts`
- Argument parsing: `src/uitestSpike/index.ts`
- Runner orchestration: `src/uitestSpike/runner.ts`
- Environment discovery: `src/uitestSpike/environment.ts`
- Mockable command execution tests: `tests/uitest-spike-runner.test.ts`

The new tool should reuse that style, but not reuse the current spike behavior that scans UI IDs, mounts fixture tests, dumps layout trees, captures screenshots, or evaluates `LIST-001`.

## Project Name and Location

Create a new tool project:

```text
/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner
```

Package name:

```json
{
  "name": "harmonyos-ohostest-runner"
}
```

Primary script:

```bash
npm run ohostest:matrix -- --project /path/to/harmony-project
```

## Non-Goals

This first version will not:

- Generate or modify test cases.
- Mount fixture `ohosTest` assets into the target project.
- Scan ArkTS source for UI IDs or component contracts.
- Run `uitest dumpLayout`.
- Capture screenshots.
- Calculate List lanes, Tabs position, overflow, or any layout rule result.
- Decide whether responsive behavior is correct beyond the actual `aa test` pass/fail result.
- Run devices in parallel.
- Manage remote CI infrastructure.

## Core Use Case

The user has already written `ohosTest` test cases in a HarmonyOS project. They want one command to run those tests across a configured device matrix and receive a structured report.

Example command:

```bash
cd /Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner
npm run ohostest:matrix -- \
  --project /Users/guoyutong/DevecostudioProjects/02-dev/ResponsiveRepeatLayout \
  --out /Users/guoyutong/DevecostudioProjects/02-dev/ResponsiveRepeatLayout/.ohostest-runs/latest/result.json
```

## Configuration

The runner reads HarmonyOS project metadata at runtime and machine-specific settings from the tool project.

Project metadata is inferred from:

- `build-profile.json5`: product name, entry module name, entry module `srcPath`
- `AppScope/app.json5`: bundle name
- `<entry-srcPath>/src/ohosTest/module.json5`: test module name

Machine-specific config defaults to:

```text
harmonyos-ohostest-runner/config/machine.json
```

Example:

```json
{
  "paths": {
    "hvigorw": "/Users/guoyutong/command-line-tools/bin/hvigorw",
    "hdc": "/Users/guoyutong/command-line-tools/sdk/default/openharmony/toolchains/hdc",
    "emulatorBin": "/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator",
    "emulatorDeployedDir": "/Users/guoyutong/.Huawei/Emulator/deployed"
  },
  "devices": [
    {
      "id": "phone",
      "profile": "Mate 80 Pro",
      "target": "127.0.0.1:15001",
      "hdcPort": 15001,
      "startEmulator": true
    },
    {
      "id": "foldable",
      "profile": "Mate X7",
      "target": "127.0.0.1:15002",
      "hdcPort": 15002,
      "startEmulator": true
    },
    {
      "id": "tablet",
      "profile": "MatePad Pro 13",
      "target": "127.0.0.1:15003",
      "hdcPort": 15003,
      "startEmulator": true
    }
  ]
}
```

Config rules:

- `project` CLI argument points to the HarmonyOS project root.
- `paths.hvigorw` is required and must point to the local Hvigor wrapper command to execute.
- `devices[].target` is used for all HDC commands through `hdc -t <target>`.
- `devices[].startEmulator=true` means the runner starts and stops the named DevEco emulator profile.
- If `startEmulator=false`, the runner treats the device as already connected and only waits for HDC readiness.
- Artifact paths are relative to `project` unless absolute.
- `testClass` is optional. If omitted, the runner executes the full `entry_test` module.

Optional class filter:

```json
{
  "testClass": "HomePageAdaptiveTest"
}
```

When present, the `aa test` command includes:

```bash
-s class HomePageAdaptiveTest
```

## CLI

Required arguments:

```text
--project <path>
```

Optional arguments:

```text
--out <path>
--device <id>
--machine-config <path>
--test-class <className>
--skip-build true|false
--keep-emulators true|false
```

Behavior:

- `--device` may be repeated to run only selected devices from config.
- `--test-class` overrides config `testClass`.
- `--skip-build true` skips HAP build and uses configured artifact paths.
- `--keep-emulators true` leaves started emulators running after execution.
- If `--out` is omitted, the runner writes to `<project>/.ohostest-runs/<timestamp>/result.json`.

## Execution Flow

The first implementation runs devices serially.

1. Load and validate config.
2. Resolve `project`, `hvigorw`, `hdc`, HAP paths, and output directory.
3. Build app and test artifacts unless `--skip-build true`.
4. Verify the app HAP and test HAP exist.
5. For each selected device:
   1. Start emulator profile when requested.
   2. Wait until `hdc -t <target> list targets` or equivalent target check succeeds.
   3. Wake and unlock the device.
   4. Return to Home.
   5. Install app HAP and test HAP with `hdc -t <target> install -r`.
   6. Execute `aa test`.
   7. Parse test summary and report code.
   8. Record stdout, stderr, duration, and parsed result.
   9. Stop emulator unless `--keep-emulators true`.
6. Derive top-level result:
   - `passed`: every selected device finished with zero failures and zero errors.
   - `failed`: at least one selected device ran tests and reported failure or error.
   - `blocked`: no selected device reached test execution because of build, config, install, or connection failures.
   - `partial`: at least one device passed but at least one device was blocked before test execution.
7. Write `result.json`, `summary.md`, and command logs.

## Commands

Build command for the current project shape:

```bash
<hvigorw> --mode project -p product=default assembleApp --analyze=normal --parallel --incremental --no-daemon
```

Test HAP build command:

```bash
<hvigorw> --mode module -p module=entry@ohosTest ohosTest@PackageHap --no-daemon --stacktrace
```

Install command:

```bash
<hdc> -t <target> install -r <appHap> <testHap>
```

Full test command:

```bash
<hdc> -t <target> shell aa test -b <bundleName> -m <testModule> -s unittest <testRunner> -s timeout 15000 -w <timeoutMs>
```

Class-filtered test command:

```bash
<hdc> -t <target> shell aa test -b <bundleName> -m <testModule> -s unittest <testRunner> -s class <testClass> -s timeout 15000 -w <timeoutMs>
```

Device preparation commands:

```bash
<hdc> -t <target> shell power-shell wakeup
<hdc> -t <target> shell uitest uiInput keyEvent Home
```

The first version does not need swipe coordinates in config unless real execution shows the lock screen cannot be cleared by `wakeup` and `Home` alone.

## Result Schema

`result.json` schema version:

```json
{
  "schemaVersion": "ohostest-matrix-v1"
}
```

Example result:

```json
{
  "schemaVersion": "ohostest-matrix-v1",
  "project": "/Users/guoyutong/DevecostudioProjects/02-dev/ResponsiveRepeatLayout",
  "status": "passed",
  "startedAt": "2026-06-22T08:00:00.000Z",
  "finishedAt": "2026-06-22T08:12:00.000Z",
  "durationMs": 720000,
  "build": {
    "status": "passed",
    "appHap": "entry/build/default/outputs/default/entry-default-unsigned.hap",
    "testHap": "entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap"
  },
  "devices": [
    {
      "id": "phone",
      "profile": "Mate 80 Pro",
      "target": "127.0.0.1:15001",
      "status": "passed",
      "testsRun": 25,
      "failures": 0,
      "errors": 0,
      "passes": 25,
      "ignored": 0,
      "reportCode": 0,
      "durationMs": 140000,
      "log": "devices/phone.log"
    }
  ],
  "artifacts": {
    "commandLog": "commands.log",
    "summary": "summary.md"
  },
  "diagnostics": []
}
```

Per-device status values:

- `passed`
- `failed`
- `blocked`

Blocked reasons should be explicit:

- `emulator_start_failed`
- `hdc_not_connected`
- `install_failed`
- `test_command_failed`
- `test_output_unparseable`

## Output Files

For each run:

```text
.ohostest-runs/<timestamp>/
  result.json
  summary.md
  commands.log
  devices/
    phone.log
    foldable.log
    tablet.log
```

`commands.log` records the command sequence with stdout/stderr boundaries.

Each device log records:

- emulator start/stop command result
- HDC readiness polling result
- install output
- raw `aa test` output
- parsed test summary

`summary.md` is human-readable and optimized for plan verification:

```markdown
# ohosTest Matrix Summary

Status: passed

| Device | Target | Status | Tests | Failure | Error | Pass | Ignore |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| phone | 127.0.0.1:15001 | passed | 25 | 0 | 0 | 25 | 0 |
| foldable | 127.0.0.1:15002 | passed | 25 | 0 | 0 | 25 | 0 |
| tablet | 127.0.0.1:15003 | passed | 25 | 0 | 0 | 25 | 0 |
```

## Architecture

Use small focused TypeScript modules:

```text
harmonyos-ohostest-runner/
  package.json
  tsconfig.json
  scripts/
    runOhosTestMatrix.ts
  src/
    index.ts
    config.ts
    command.ts
    environment.ts
    artifacts.ts
    device.ts
    ohostest.ts
    result.ts
    runner.ts
    types.ts
  tests/
    config.test.ts
    command.test.ts
    ohostest.test.ts
    result.test.ts
    runner.test.ts
```

Responsibilities:

- `index.ts`: CLI argument parsing and public exports.
- `config.ts`: JSON config loading, defaulting, validation, and path resolution.
- `command.ts`: command execution abstraction and command log writer.
- `environment.ts`: HDC path, emulator path, profile existence, and HAP path checks.
- `artifacts.ts`: output directory creation and relative artifact paths.
- `device.ts`: emulator start/stop, HDC target readiness, wake/home preparation, install.
- `ohostest.ts`: `aa test` command construction and output parsing.
- `result.ts`: top-level status derivation and summary Markdown generation.
- `runner.ts`: orchestration from config to final result.
- `types.ts`: shared TypeScript interfaces.

## Reused Ideas From the Reference Project

Reuse these patterns:

- Standalone TypeScript CLI with `node --import tsx`.
- Dependency-free runtime.
- Injected `commandExecutor` for tests.
- Injected emulator launcher/stopper for tests.
- Structured `result.json`.
- Command logs as first-class artifacts.
- Serial device execution by default.

Do not reuse these behaviors:

- `scanProjectForUitestRules`.
- `mountUitestSpikeAssets`.
- `captureScreenshot`.
- `captureComponentEvidence`.
- `deriveListMetricsFromTree`.
- `buildMultiBreakpointRuleResults`.
- Any `LIST-001` specific result logic.

## Testing Strategy

Unit tests should not require real devices.

Required tests:

1. Config parsing accepts the example config and resolves relative HAP paths.
2. Config validation rejects missing `bundleName`, empty `devices`, and invalid target entries.
3. `aa test` command builder emits the full-module command when no class is configured.
4. `aa test` command builder emits `-s class <testClass>` when class filtering is configured.
5. Output parser extracts `Tests run`, `Failure`, `Error`, `Pass`, `Ignore`, and `OHOS_REPORT_CODE`.
6. Output parser marks missing summary as `test_output_unparseable`.
7. Result derivation returns `passed` when all devices pass.
8. Result derivation returns `failed` when any device reports failure or error.
9. Result derivation returns `partial` when some devices pass and some are blocked.
10. Runner test verifies command order for build, install, and `aa test` using a fake executor.

One local integration check after implementation:

```bash
npm test
npm run build
```

One real-device verification after implementation:

```bash
npm run ohostest:matrix -- \
  --project /Users/guoyutong/DevecostudioProjects/02-dev/ResponsiveRepeatLayout
```

Success condition for the real-device verification is all selected devices returning:

```text
Failure: 0, Error: 0, OHOS_REPORT_CODE: 0
```

## Permissions and Runtime Assumptions

The tool assumes Codex/default local execution can access:

- target HarmonyOS project directory
- machine config `paths.hvigorw`
- `/Users/guoyutong/command-line-tools/sdk/default/openharmony/toolchains/hdc`
- `/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator`
- `/Users/guoyutong/.Huawei/Emulator/deployed`
- `/Users/guoyutong/.hvigor`
- `/Users/guoyutong/.ohpm`

Network access is not required for normal execution after project dependencies are already installed.

## Acceptance Criteria

The spec is complete when the implementation can:

1. Run from a new standalone project under `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner`.
2. Execute existing `ohosTest` tests without generating or modifying test files.
3. Build app and test HAP artifacts unless explicitly skipped.
4. Run the same test command across phone, foldable, and tablet devices from config.
5. Use `hdc -t <target>` for every device-specific command.
6. Produce `result.json`, `summary.md`, `commands.log`, and per-device logs.
7. Correctly parse successful output such as `Tests run: 25, Failure: 0, Error: 0, Pass: 25, Ignore: 0`.
8. Correctly report failed tests when `Failure > 0` or `Error > 0`.
9. Correctly report blocked devices when emulator, HDC, install, or output parsing fails.
10. Avoid DOM tree collection, screenshot capture, and layout rule judgment entirely.

## Open Decisions for User Confirmation

These choices are baked into the proposed first implementation unless changed before execution:

1. The new project directory is `harmonyos-ohostest-runner`.
2. The first version runs devices serially.
3. The config format is JSON, not TOML or YAML.
4. Full-module `aa test` is the default; class filtering is optional.
5. Screenshots and layout dumps are excluded even on failure.
6. The runner writes outputs under `<project>/.ohostest-runs/<timestamp>` by default.

# HarmonyOS ohosTest Matrix Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Node/TypeScript CLI that runs existing HarmonyOS `ohosTest` suites across a configured device matrix and writes structured results.

**Architecture:** The tool uses focused TypeScript modules for config parsing, command execution, device orchestration, `aa test` command/result handling, and summary generation. It intentionally excludes screenshot capture, DOM/component tree collection, and layout rule judgment.

**Tech Stack:** Node.js, TypeScript, `node:test`, `tsx`, no runtime dependencies.

---

### Task 1: Project Scaffold and RED Tests

**Files:**
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/package.json`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/tsconfig.json`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/tests/config.test.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/tests/ohostest.test.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/tests/result.test.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/tests/runner.test.ts`

- [ ] **Step 1: Write tests first**

Cover config validation/path resolution, `aa test` command construction, test output parsing, top-level status derivation, and runner command order.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test`

Expected: fail because `src/*.ts` implementation modules do not exist yet.

### Task 2: Core Types, Config, and Result Logic

**Files:**
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/src/types.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/src/config.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/src/ohostest.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/src/result.ts`

- [ ] **Step 1: Implement minimal typed model**

Define config, device, command result, build result, per-device result, and matrix result interfaces.

- [ ] **Step 2: Implement config loading and validation**

Parse JSON config, require `bundleName`, require at least one device, validate device `id` and `target`, and resolve artifact paths relative to `project`.

- [ ] **Step 3: Implement `aa test` helpers**

Build full-module and class-filtered commands and parse `Tests run`, `Failure`, `Error`, `Pass`, `Ignore`, and `OHOS_REPORT_CODE`.

- [ ] **Step 4: Implement status and markdown summary**

Derive `passed`, `failed`, `blocked`, or `partial` from per-device results and render a markdown table.

- [ ] **Step 5: Run focused tests**

Run: `npm test`

Expected: tests for these modules pass; runner may still fail until orchestration exists.

### Task 3: Command, Device, Runner, and CLI

**Files:**
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/src/command.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/src/device.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/src/runner.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/src/index.ts`
- Create: `/Users/guoyutong/DevecostudioProjects/02-dev/harmonyos-ohostest-runner/scripts/runOhosTestMatrix.ts`

- [ ] **Step 1: Implement command executor**

Expose an injectable executor and a log writer that records command, stdout, stderr, exit code, and duration.

- [ ] **Step 2: Implement device helpers**

Build emulator start/stop commands, wait for target readiness, wake/home device prep, and HAP install commands using `hdc -t <target>`.

- [ ] **Step 3: Implement runner orchestration**

Build unless skipped, verify HAPs, run devices serially, collect logs, parse `aa test`, derive matrix status, and write `result.json` / `summary.md`.

- [ ] **Step 4: Implement CLI**

Parse `--project`, `--config`, `--out`, repeated `--device`, `--test-class`, `--skip-build`, and `--keep-emulators`.

- [ ] **Step 5: Run full tests and build**

Run: `npm test`

Expected: all tests pass.

Run: `npm run build`

Expected: TypeScript build exits successfully.

### Task 4: Acceptance Review

- [ ] **Step 1: Re-read design spec acceptance criteria**

Confirm the implementation satisfies all non-device criteria.

- [ ] **Step 2: Report verification evidence**

Summarize exact commands run, exit status, and any limitations such as real-device verification not executed yet.


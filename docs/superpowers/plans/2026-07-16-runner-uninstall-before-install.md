# Runner Uninstall Before Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the runner uninstall the configured application bundle from each target device before installing its app and test HAPs.

**Architecture:** Keep the behavior inside the existing `installHaps` device operation. Issue an HDC uninstall command using the existing target-specific command prefix and resolved bundle name, ignore its result, then retain the current install command and install-failure handling.

**Tech Stack:** TypeScript, Node.js test runner, `tsx`, HDC command-line interface.

---

## File Structure

- Modify `harmonyos-ohostest-runner/tests/device.test.ts`: add a focused regression test for uninstall/install ordering and ignored uninstall failure.
- Modify `harmonyos-ohostest-runner/src/matrix/device.ts`: add the pre-install uninstall command to `installHaps`.

### Task 1: Uninstall the Existing Bundle Before HAP Installation

**Files:**
- Modify: `harmonyos-ohostest-runner/tests/device.test.ts`
- Modify: `harmonyos-ohostest-runner/src/matrix/device.ts:61-69`

- [ ] **Step 1: Write the failing regression test**

Update the import in `harmonyos-ohostest-runner/tests/device.test.ts` and add this test:

```typescript
import {
  buildStartEmulatorCommand,
  ensureTargetReady,
  installHaps,
  waitForTargetDisconnected,
} from "../src/matrix/device.js";

test("installHaps ignores uninstall failure and uninstalls the bundle before installing HAPs", async () => {
  const config = makeConfig();
  const device: DeviceConfig = {
    id: "phone",
    target: "127.0.0.1:15001",
    startEmulator: false,
  };
  const commands: string[] = [];

  await installHaps({
    config,
    device,
    cwd: config.project,
    outDir: "out",
    runCommand: async (command) => {
      commands.push(command);
      return {
        stdout: "",
        stderr: command.includes(" uninstall ") ? "bundle not found" : "",
        exitCode: command.includes(" uninstall ") ? 1 : 0,
        durationMs: 1,
      };
    },
  });

  assert.deepEqual(commands, [
    "hdc -t 127.0.0.1:15001 uninstall zhsc.1.xxxxxx",
    "hdc -t 127.0.0.1:15001 install -r 'D:\\Projects\\ResponsiveRepeatLayout\\entry-default-unsigned.hap' 'D:\\Projects\\ResponsiveRepeatLayout\\entry-ohosTest-unsigned.hap'",
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `harmonyos-ohostest-runner`:

```bash
node --import tsx --test --test-name-pattern="installHaps ignores uninstall failure" tests/device.test.ts
```

Expected: FAIL because `commands` contains only the install command and is missing the uninstall command.

- [ ] **Step 3: Add the minimal pre-install uninstall behavior**

Change `installHaps` in `harmonyos-ohostest-runner/src/matrix/device.ts` to:

```typescript
export async function installHaps(ctx: DeviceCommandContext): Promise<void> {
  const hdc = hdcFor(ctx.config, ctx.device);
  await ctx.runCommand(`${hdc} uninstall ${shellQuote(ctx.config.bundleName)}`);
  const result = await ctx.runCommand(
    `${hdc} install -r ${shellQuote(ctx.config.artifacts.appHap)} ${shellQuote(ctx.config.artifacts.testHap)}`,
  );
  if (result.exitCode !== 0) {
    throw new Error("install_failed");
  }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run from `harmonyos-ohostest-runner`:

```bash
node --import tsx --test --test-name-pattern="installHaps ignores uninstall failure" tests/device.test.ts
```

Expected: PASS, proving that uninstall precedes install and a failed uninstall does not abort the flow.

- [ ] **Step 5: Run the full verification suite**

Run from `harmonyos-ohostest-runner`:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass, ESLint reports no errors, and TypeScript compilation exits with code 0.

- [ ] **Step 6: Commit the implementation**

```bash
git add harmonyos-ohostest-runner/tests/device.test.ts harmonyos-ohostest-runner/src/matrix/device.ts
git commit -m "fix: uninstall bundle before installing haps"
```

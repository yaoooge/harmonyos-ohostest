# PC Screen Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect HarmonyOS PC targets at runtime and use Enter rather than Home to leave the lock screen.

**Architecture:** Extend the existing device preparation sequence with a best-effort `const.product.devicetype` probe after HDC readiness succeeds. Treat only the verified `2in1` value as a PC; every other value and probe failure falls back to the existing Home behavior.

**Tech Stack:** TypeScript, Node.js test runner, HDC, Markdown

---

## File Structure

- Modify `harmonyos-ohostest-runner/src/matrix/device.ts`: probe the connected target and select the unlock key.
- Modify `harmonyos-ohostest-runner/tests/device.test.ts`: verify PC, non-PC, and failed-probe command sequences through `prepareDevice`.
- Modify `harmonyos-ohostest-runner/docs/usage/matrix.md`: document automatic runtime type detection.
- Modify `harmonyos-ohostest-runner/docs/usage/troubleshooting.md`: document how to inspect PC detection when unlock fails.

### Task 1: Runtime PC Detection and Unlock Selection

**Files:**

- Modify: `harmonyos-ohostest-runner/tests/device.test.ts`
- Modify: `harmonyos-ohostest-runner/src/matrix/device.ts:60-65`

- [ ] **Step 1: Write the failing command-sequence regression test**

Add `prepareDevice` to the import from `../src/matrix/device.js`, then add:

```typescript
test("prepareDevice selects the unlock key from the runtime device type", async (t) => {
  const cases = [
    {
      name: "uses Enter for a 2in1 PC",
      probe: {
        stdout: "2in1\n",
        stderr: "",
        exitCode: 0,
        durationMs: 1,
      },
      expectedKey: "2054",
    },
    {
      name: "keeps Home for a phone",
      probe: {
        stdout: "phone\n",
        stderr: "",
        exitCode: 0,
        durationMs: 1,
      },
      expectedKey: "Home",
    },
    {
      name: "falls back to Home when the probe fails",
      probe: {
        stdout: "",
        stderr: "unsupported parameter",
        exitCode: 1,
        durationMs: 1,
      },
      expectedKey: "Home",
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const config = makeConfig();
      const device: DeviceConfig = {
        id: "arbitrary-user-id",
        target: "127.0.0.1:15004",
        startEmulator: true,
      };
      const commands: string[] = [];

      await prepareDevice({
        config,
        device,
        cwd: config.project,
        outDir: "out",
        runCommand: async (command) => {
          commands.push(command);
          if (command === "hdc list targets") {
            return {
              stdout: "127.0.0.1:15004\tConnected\n",
              stderr: "",
              exitCode: 0,
              durationMs: 1,
            };
          }
          if (command.endsWith("param get const.product.devicetype")) {
            return testCase.probe;
          }
          return {
            stdout: "",
            stderr: "",
            exitCode: 0,
            durationMs: 1,
          };
        },
      });

      assert.deepEqual(commands, [
        "hdc list targets",
        "hdc -t 127.0.0.1:15004 shell param get const.product.devicetype",
        "hdc -t 127.0.0.1:15004 shell power-shell wakeup",
        `hdc -t 127.0.0.1:15004 shell uitest uiInput keyEvent ${testCase.expectedKey}`,
      ]);
    });
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd harmonyos-ohostest-runner
node --import tsx --test --test-name-pattern="prepareDevice selects" tests/device.test.ts
```

Expected: FAIL because `prepareDevice` does not issue the parameter probe and still sends `Home` for the `2in1` case.

- [ ] **Step 3: Implement the minimal runtime selection**

Replace `prepareDevice` with:

```typescript
export async function prepareDevice(ctx: DeviceCommandContext): Promise<void> {
  const hdc = hdcFor(ctx.config, ctx.device);
  await ensureTargetReady(ctx);
  const deviceType = await ctx.runCommand(
    `${hdc} shell param get const.product.devicetype`,
  );
  await ctx.runCommand(`${hdc} shell power-shell wakeup`);
  const unlockKey =
    deviceType.exitCode === 0 &&
    deviceType.stdout.trim().toLowerCase() === "2in1"
      ? "2054"
      : "Home";
  await ctx.runCommand(`${hdc} shell uitest uiInput keyEvent ${unlockKey}`);
}
```

This intentionally handles only the locally verified `2in1` value and preserves Home as the fallback.

- [ ] **Step 4: Run the focused device tests and verify GREEN**

Run:

```bash
cd harmonyos-ohostest-runner
node --import tsx --test tests/device.test.ts
```

Expected: all tests in `tests/device.test.ts` PASS with no warnings or errors.

- [ ] **Step 5: Commit the behavior change**

```bash
git add harmonyos-ohostest-runner/src/matrix/device.ts harmonyos-ohostest-runner/tests/device.test.ts
git commit -m "fix: unlock HarmonyOS PC targets"
```

### Task 2: User Documentation and Full Verification

**Files:**

- Modify: `harmonyos-ohostest-runner/docs/usage/matrix.md`
- Modify: `harmonyos-ohostest-runner/docs/usage/troubleshooting.md`

- [ ] **Step 1: Document automatic detection in matrix usage**

After the device configuration field table in `matrix.md`, add:

```markdown
设备 ID 只用于选择和报告，不用于判断设备形态。target 连接后，runner 会读取
`const.product.devicetype`：值为 `2in1` 时使用 PC 的 Enter 键解锁，其他值或读取失败时
继续使用触屏设备的 Home 键。无需为 PC 使用特定 `id`，也无需增加设备类型配置。
```

- [ ] **Step 2: Add PC unlock troubleshooting**

Add this section to `troubleshooting.md` before “折叠测试失败”:

````markdown
## 设备阶段：PC 唤醒后仍停留在锁屏

runner 通过目标系统参数判断 PC：

```bash
hdc -t <target> shell param get const.product.devicetype
```

MateBook/2in1 目标应返回 `2in1`，runner 随后发送 Enter 键码 `2054`。如果参数读取失败或
返回其他值，runner 会兼容性回退到 Home。检查 `commands.log`，确认参数探测结果及实际
发送的按键；设备 `id` 不参与类型判断。
````

- [ ] **Step 3: Run formatting checks without rewriting user files**

Run:

```bash
git diff --check
npx prettier --check src/matrix/device.ts tests/device.test.ts
```

Expected: both commands exit `0`.

- [ ] **Step 4: Run the complete runner verification**

Run from `harmonyos-ohostest-runner`:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass, ESLint exits `0`, and TypeScript compilation exits `0`.

- [ ] **Step 5: Run the connected MateBook smoke check when available**

If `hdc list targets` still contains `127.0.0.1:15004`, run:

```bash
hdc -t 127.0.0.1:15004 shell power-shell suspend
hdc -t 127.0.0.1:15004 shell power-shell wakeup
hdc -t 127.0.0.1:15004 shell param get const.product.devicetype
hdc -t 127.0.0.1:15004 shell uitest uiInput keyEvent 2054
hdc -t 127.0.0.1:15004 shell uitest dumpLayout
```

Expected: the probe prints `2in1`, each command succeeds, and the resulting UI tree contains `SCBDesktop` or `SmartDock` but not `ScreenLock`.

- [ ] **Step 6: Commit documentation**

```bash
git add harmonyos-ohostest-runner/docs/usage/matrix.md harmonyos-ohostest-runner/docs/usage/troubleshooting.md
git commit -m "docs: explain automatic PC unlock detection"
```

# PC Screen Unlock Design

## Problem

The matrix runner prepares every connected device with the same commands:

```text
power-shell wakeup
uitest uiInput keyEvent Home
```

This works for the existing touch-device profiles, but a HarmonyOS PC remains
on its lock screen after `Home`. The command itself still reports success, so
the runner continues without realizing that the desktop is unavailable.

Local validation against the `MateBook Pro` HarmonyOS 6.1.1 emulator showed:

- `param get const.product.devicetype` returns `2in1`.
- `power-shell wakeup` followed by `Home` leaves `ScreenLock` in the UI tree.
- `power-shell wakeup` followed by key code `2054` removes `ScreenLock` and
  exposes `SCBDesktop` and `SmartDock`.

## Goals

- Detect a PC from the connected target instead of its user-defined device ID.
- Use the verified PC-specific Enter key event to leave the lock screen.
- Preserve the current behavior for phone, tablet, foldable, and older targets.
- Avoid adding required machine configuration.

## Non-goals

- Detect whether a password-protected device can be unlocked.
- Add configurable arbitrary device preparation command lists.
- Verify the resulting UI tree during every runner execution.
- Change emulator startup, HDC readiness polling, installation, or test execution.

## Design

After `ensureTargetReady` succeeds, `prepareDevice` queries the target:

```text
<hdc-for-target> shell param get const.product.devicetype
```

The returned standard output is trimmed and compared case-insensitively with
`2in1`.

The preparation sequence becomes:

```text
ensure target ready
query const.product.devicetype
power-shell wakeup
send 2054 when type is 2in1; otherwise send Home
```

The detection helper treats only the verified value `2in1` as a PC. Any other
value, empty output, command failure, or unsupported-parameter diagnostic uses
the existing `Home` behavior. Detection is therefore advisory and cannot block
devices that previously worked.

No `id`, `profile`, local emulator metadata, or new configuration field is used
to select the command. This also permits a real PC target to use the same path.

## Error Handling

The device-type query result is inspected but does not throw solely because its
exit code is nonzero or its output is unknown. Existing command execution
logging still records the probe. Wakeup and key input retain the current
best-effort behavior.

HDC readiness failures continue to produce the existing
`hdc_not_connected` blocked result before probing starts.

## Testing

Unit tests around `prepareDevice` will record executed commands and cover:

1. A connected target reporting `2in1` receives the device-type probe, wakeup,
   and `keyEvent 2054`, in that order.
2. A connected target reporting a non-PC value receives the probe, wakeup, and
   `keyEvent Home`.
3. A failed or unsupported device-type probe falls back to `Home`.

The focused device test file and the complete runner test suite will be run.
The local MateBook emulator will then be used for a final command-level smoke
check when it remains available.

## Documentation

Runner usage and troubleshooting documentation will state that device type is
detected at runtime through `const.product.devicetype`; users do not need to
name a device `pc` or add a new machine configuration field.

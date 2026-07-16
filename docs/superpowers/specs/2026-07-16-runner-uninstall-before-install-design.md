# Runner Install Pre-Uninstall Design

## Problem

When the runner installs HAPs for an application whose bundle name is already installed on the target device, HDC can fail with error code `9568267` and the message `install entry already exist`.

## Design

Before every HAP installation, the runner executes:

```text
hdc -t <target> uninstall <bundleName>
```

It then executes the existing installation command:

```text
hdc -t <target> install -r <appHap> <testHap>
```

The bundle name comes from the existing resolved matrix configuration. All command arguments continue to use the runner's shell-quoting utilities.

## Error Handling

The runner ignores the uninstall command's exit code because a missing installed application is an expected state on a first run. The existing installation behavior remains unchanged: a non-zero install exit code raises `install_failed`.

## Testing

Regression tests verify that:

1. The uninstall command uses the configured target and bundle name.
2. The uninstall command runs immediately before the install command.
3. A non-zero uninstall exit code does not prevent installation.
4. Existing matrix-runner tests continue to pass.

## Release Metadata

The runner package version changes from `0.1.0` to `0.1.1`. A new
`harmonyos-ohostest-runner/CHANGELOG.md` follows the Keep a Changelog layout and
adds a `0.1.1` entry dated `2026-07-16` describing the pre-install uninstall fix
and the intentionally ignored uninstall failure.

## Scope

The code change is limited to the device HAP installation flow and its tests.
The only other changes are the runner package version and changelog. It does not
add installation retries, installed-package discovery, or new configuration
fields.

# HarmonyOS ohosTest Matrix Runner

Standalone CLI for running existing HarmonyOS `ohosTest` suites across a configured device matrix.

This tool only builds HAPs, installs them, runs `aa test`, parses the test summary, and writes logs/results. It does not generate tests, capture screenshots, dump component trees, or judge layout rules.

## Usage

```bash
npm install
npm run ohostest:matrix -- \
  --project /Users/guoyutong/DevecostudioProjects/02-dev/ResponsiveRepeatLayout
```

Useful options:

```text
--out <path>
--device <id>
--machine-config <path>
--test-class <className>
--skip-build true|false
--keep-emulators true|false
```

`--device` can be repeated to run a subset of the configured matrix.

## Project Discovery

The runner reads HarmonyOS project metadata at runtime:

- `build-profile.json5`: product name, entry module name, entry module `srcPath`
- `AppScope/app.json5`: bundle name
- `<entry-srcPath>/src/ohosTest/module.json5`: test module name

HAP paths are derived from the entry module source path after the tool builds the app and `ohosTest` package.

## Machine Config

Machine-specific settings live in this tool project, not in every target HarmonyOS project:

```text
config/machine.json
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

## Output

By default, outputs are written under:

```text
<project>/.ohostest-runs/<timestamp>/
  result.json
  summary.md
  commands.log
  devices/
```

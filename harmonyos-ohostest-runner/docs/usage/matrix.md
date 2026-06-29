# 矩阵测试运行

运行器会在设备矩阵上执行 HarmonyOS 工程中已有的 `ohosTest` 用例。它不会生成测试用例、截图、dump 组件树，也不会判断布局规则本身。

## 命令

```bash
npm run ohostest:matrix -- \
  --project /path/to/ResponsiveRepeatLayout
```

常用参数：

```text
--out <path>                  指定 result.json 输出路径
--device <id>                 只运行指定设备，可重复传入
--machine-config <path>       指定设备矩阵配置文件
--test-class <className>      只运行指定 suite class
--skip-build true|false       是否跳过构建
--keep-emulators true|false   运行结束后是否保留模拟器
```

如果不传 `--device`，默认运行 `machine.json` 中配置的全部设备。命令行传入 `--test-class <className>` 时，只运行该 suite class。

## 工程信息发现

运行器会在目标 HarmonyOS 工程中自动读取：

- `build-profile.json5`：product 名称、entry module 名称、entry module 的 `srcPath`
- `AppScope/app.json5`：bundle name
- `<entry-srcPath>/src/ohosTest/module.json5`：ohosTest module 名称

构建完成后，应用 HAP 和测试 HAP 路径会根据 entry module 的源码路径自动推导。

## 设备矩阵配置

默认配置文件：

```text
config/machine.json
```

配置示例：

```json
{
  "paths": {
    "hvigorw": "/path/to/hvigorw",
    "hdc": "/path/to/hdc",
    "emulatorBin": "/path/to/Emulator",
    "emulatorDeployedDir": "/path/to/.Huawei/Emulator/deployed",
    "foldServerScript": "src/fold/assets/fold-server.py"
  },
  "devices": [
    {
      "id": "phone",
      "profile": "Mate 80 Pro",
      "target": "127.0.0.1:15001",
      "hdcPort": 15001,
      "startEmulator": true,
      "testSuites": ["CommonPassToPassTest", "SmPassToPassTest"]
    },
    {
      "id": "foldable",
      "profile": "Mate X7",
      "target": "127.0.0.1:15002",
      "hdcPort": 15002,
      "startEmulator": true,
      "foldControl": true,
      "testSuites": ["CommonPassToPassTest", "MdFailToPassTest", "FoldControlTest"]
    }
  ]
}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `paths.hvigorw` | Hvigor 命令，必填；如果命令目录已加入环境变量，可填写 `hvigorw` |
| `paths.hdc` | hdc 命令，必填；如果命令目录已加入环境变量，可填写 `hdc` |
| `paths.emulatorBin` | DevEco 模拟器命令，必填；如果模拟器目录已加入环境变量，可填写 `Emulator` |
| `paths.emulatorDeployedDir` | 模拟器实例目录，必填 |
| `paths.foldServerScript` | fold-server.py 路径；有设备启用 `foldControl` 时必填 |
| `devices[].id` | 设备标识，用于 `--device` |
| `devices[].profile` | 模拟器 profile 名称 |
| `devices[].target` | hdc target，例如 `127.0.0.1:15002` |
| `devices[].hdcPort` | 启动模拟器时使用的 hdc 端口 |
| `devices[].startEmulator` | 是否由运行器启动该模拟器 |
| `devices[].foldControl` | 是否启用折叠屏/旋转控制 |
| `devices[].testSuites` | 该设备要执行的 suite class 列表，按声明顺序运行，重复 class 会自动去重 |

如果设备未配置 `testSuites`，且命令行未传 `--test-class`，运行器会执行完整测试模块。

## 输出结果

默认输出目录：

```text
<project>/.ohostest-runs/<timestamp>/
  result.json
  summary.md
  commands.log
  devices/
```

输出说明：

- `result.json`：完整矩阵结果，包含每台设备、每个 suite、每条用例的状态
- `summary.md`：人工可读汇总报告，包含设备汇总、suite 明细和用例明细
- `commands.log`：构建、安装、启动模拟器、执行测试等命令日志
- `devices/`：每台设备和每个 suite 的原始输出日志

矩阵级 `status`：

- `completed`：所有选中的设备都完成了测试执行
- `failed`：至少有设备未完成执行，例如模拟器启动失败、hdc 未连接、安装失败或测试输出无法解析

具体用例是否通过，请查看 `summary.md` 中每个 suite 下的用例状态，或查看 `result.json` 的 `devices[].suiteResults[].testCases`。

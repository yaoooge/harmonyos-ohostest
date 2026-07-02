# HarmonyOS ohosTest Runner

独立的命令行工具，用于在配置好的设备矩阵上运行 HarmonyOS 工程中已有的 `ohosTest` 用例。工具负责构建 HAP、安装应用与测试包、执行 `aa test`、解析测试结果，并输出结构化报告和命令日志。

## 功能

- 执行 ohosTest 设备矩阵
- 按设备执行指定 suite class
- 自动构建、安装、唤醒设备并执行测试
- 输出 `result.json`、`summary.md`、`commands.log` 和设备日志
- 可选管理折叠屏/旋转控制服务

## 依赖

- Node.js 与 npm
- DevEco Studio 命令行工具
- HarmonyOS SDK 中的 `hdc`
- DevEco Emulator 命令
- Python 3.6+，用于折叠屏控制服务
- 可构建的 HarmonyOS 工程，且工程中已存在 `ohosTest` 用例

构建 HarmonyOS 工程需要设置：

```bash
export DEVECO_SDK_HOME="/Applications/DevEco-Studio.app/Contents/sdk"
export JAVA_HOME="/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home"
```

## 安装

```bash
npm install
```

## 快速运行

```bash
npm run ohostest:matrix -- \
  --project /path/to/ResponsiveRepeatLayout
```

以 SWE case 目录执行两轮验证：

```bash
npm run ohostest:case -- \
  --case /path/to/ResponsiveRepeatLayout/case
```

case 模式会读取 `case/metadata.json`，将 `base_project + test_patch` 作为 `swe` 轮执行，
再在同一工作目录继续应用 `golden_patch` 作为 `answer` 轮执行。设备连接、模拟器和工具路径仍来自
`config/machine.json`。实际设备集合优先使用 `metadata.device_test_suites`，其次使用
`metadata.enabled_devices`，两者都没有时使用 `machine.json.devices`。没有 `device_test_suites` 时每台设备执行
全量测试，不继承 `machine.json.devices[].testSuites`。默认报告输出到 `<case>/.ohostest-runs/<timestamp>/`。

常用参数：

```text
--out <path>                  指定 result.json 输出路径
--machine-config <path>       指定设备矩阵配置文件
--skip-build true|false       是否跳过构建
--keep-emulators true|false   运行结束后是否保留模拟器
```

case 模式额外支持：

```text
--case <path>                 指定 case 目录
--keep-workdir true|false     是否保留合成工程目录，默认 false
```

case 模式不支持 `--device` 和 `--test-class`，以保证 SWE/Answer 两轮报告的设备与 suite 选择只由 case 配置决定。

## 配置入口

默认设备矩阵配置文件：

```text
config/machine.json
```

配置中需要提供 DevEco/HarmonyOS 工具路径、模拟器实例目录、设备 target、设备 profile、是否启动模拟器、每台设备要执行的 suite class，以及需要时的折叠屏控制配置。

## 文档索引

- [矩阵测试运行](docs/usage/matrix.md)
- [case 目录执行](docs/usage/case.md)
- [折叠屏和旋转控制](docs/usage/fold-control.md)
- [故障排查](docs/usage/troubleshooting.md)
- [工程结构说明](docs/project-structure/README.md)

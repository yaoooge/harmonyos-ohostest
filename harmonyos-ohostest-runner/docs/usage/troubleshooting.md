# 故障排查

矩阵返回 `failed` 时，按 build 阶段和设备阶段定位。

## 构建阶段：Invalid DEVECO_SDK_HOME

现象：`build_failed`，hvigor 报 `Invalid DEVECO_SDK_HOME` 或 `SDK component missing`。

根因：`DEVECO_SDK_HOME` 未设置，或路径层级写错。

`DEVECO_SDK_HOME` 必须指向 `.../sdk`：

```bash
export DEVECO_SDK_HOME="/Applications/DevEco-Studio.app/Contents/sdk"
```

## 构建阶段：Unable to locate Java Runtime

现象：hvigor 报 `Unable to locate Java Runtime` 或 `Could not find tools.jar`。

根因：hvigor 工具链依赖 JDK，还缺 `JAVA_HOME`。DevEco Studio 自带 JBR，可直接指向它：

```bash
export JAVA_HOME="/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home"
```

如果 hvigor daemon 已在旧环境下启动，终止 daemon 后再运行。

## 设备阶段：hdc_not_connected 或设备 profile 不存在

现象：`build` 通过但设备阶段报 `hdc_not_connected`，或启动模拟器失败。

检查点：

1. `emulatorDeployedDir` 路径里的用户名必须与当前系统真实用户一致。
2. `profile` 必须与 `~/.Huawei/Emulator/deployed/` 下的目录名完全一致。
3. `target` 必须与 `hdc list targets` 输出一致。

排查命令：

```bash
ls ~/.Huawei/Emulator/deployed/
hdc list targets
```

## 折叠测试失败：折叠命令被设备拒绝

现象：`FoldControlTest` 出现 `cannot connect` 或折叠/展开用例失败，但旋转用例能过。

原因：启用 `foldControl: true` 并执行折叠命令的设备需要是可折叠设备或折叠屏模拟器。直板机可执行旋转命令，但不能执行折叠命令。

处理方式：将折叠测试运行在折叠屏实例上，并确认 `profile` 和 `target` 正确。

## 折叠或旋转命令失败：Emulator Unknown options

现象：fold-server 输出以下错误之一：

```text
Emulator: Unknown options: instance, rotation
Emulator: Unknown options: instance, foldedstate
```

原因：当前 DevEco Emulator 版本不支持折叠/旋转控制所需的命令参数。

检查版本：

```bash
Emulator -version
```

处理方式：使用 `26.0.0.200` 或以上版本的 Emulator。

## 环境变量生效范围

runner 通过子进程调用 hvigor，子进程继承 runner 启动时 shell 的环境变量。hvigor daemon 如果已经运行，会继续使用启动时的环境变量。

设置 `DEVECO_SDK_HOME` 和 `JAVA_HOME` 后，终止旧 hvigor daemon，再重新运行矩阵测试。

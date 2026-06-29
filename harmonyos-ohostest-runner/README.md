# HarmonyOS ohosTest 矩阵运行器

这是一个独立的命令行工具，用于在配置好的设备矩阵上运行 HarmonyOS 工程中已有的 `ohosTest` 用例。

工具负责构建 HAP、安装应用与测试包、执行 `aa test`、解析测试结果，并输出结构化报告和命令日志。它不会生成测试用例、截图、dump 组件树，也不会判断布局规则本身。

## 使用方式

```bash
npm install
npm run ohostest:matrix -- \
  --project /path/to/ResponsiveRepeatLayout
```

常用参数：

```text
--out <path>                  指定 result.json 输出路径
--device <id>                 只运行指定设备，可重复传入
--machine-config <path>       指定设备矩阵配置文件
--test-class <className>      只运行指定 suite class，优先级高于设备配置
--skip-build true|false       是否跳过构建
--keep-emulators true|false   运行结束后是否保留模拟器
```

如果不传 `--device`，默认运行 `machine.json` 中配置的全部设备。

## 工程信息发现

运行器会在目标 HarmonyOS 工程中自动读取以下配置：

- `build-profile.json5`：product 名称、entry module 名称、entry module 的 `srcPath`
- `AppScope/app.json5`：bundle name
- `<entry-srcPath>/src/ohosTest/module.json5`：ohosTest module 名称

构建完成后，应用 HAP 和测试 HAP 路径会根据 entry module 的源码路径自动推导。

## 设备矩阵配置

设备相关配置放在运行器工程中：`config/machine.json`

**配置示例**：

```json
{
  "paths": {
    "hvigorw": "/path/to/hvigorw",
    "hdc": "/path/to/hdc",
    "emulatorBin": "/path/to/Emulator",
    "emulatorDeployedDir": "/path/to/.Huawei/Emulator/deployed"
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
      "testSuites": ["CommonPassToPassTest", "SmPassToPassTest", "MdFailToPassTest"]
    },
    {
      "id": "tablet",
      "profile": "MatePad Pro 13",
      "target": "127.0.0.1:15003",
      "hdcPort": 15003,
      "startEmulator": true,
      "testSuites": ["CommonPassToPassTest", "MdFailToPassTest", "LgFailToPassTest"]
    }
  ]
}
```

**字段说明**：

- `paths.hvigorw`：Hvigor 命令，必填；如果命令目录已加入环境变量，可填写 `hvigorw`
- `paths.hdc`：hdc 命令，必填；如果命令目录已加入环境变量，可填写 `hdc`
- `paths.emulatorBin`：DevEco 模拟器命令，必填；如果模拟器目录已加入环境变量，可填写 `Emulator`
- `paths.emulatorDeployedDir`：模拟器实例目录，必填
- `devices[].id`：设备标识，用于 `--device`
- `devices[].profile`：模拟器 profile 名称
- `devices[].target`：hdc target，例如 `127.0.0.1:15002`
- `devices[].hdcPort`：启动模拟器时使用的 hdc 端口
- `devices[].startEmulator`：是否由运行器启动该模拟器
- `devices[].testSuites`：该设备要执行的 suite class 列表，按声明顺序运行，重复 class 会自动去重

如果设备未配置 `testSuites`，且命令行未传 `--test-class`，运行器会执行完整测试模块。

如果命令行传入 `--test-class <className>`，只运行该 suite class，并忽略设备上的 `testSuites` 配置。



## 输出结果

默认输出目录为：

```text
<project>/.ohostest-runs/<timestamp>/
  result.json
  summary.md
  commands.log
  devices/
```

输出说明：

- `result.json`：完整矩阵结果，包含每台设备、每个 suite、每条用例的状态
- `summary.md`：便于人工查看的汇总报告，包含设备汇总、suite 明细和用例明细
- `commands.log`：构建、安装、启动模拟器、执行测试等命令日志
- `devices/`：每台设备和每个 suite 的原始输出日志

矩阵级 `status` 的含义：

- `completed`：所有选中的设备都完成了测试执行，不代表所有用例都通过
- `failed`：至少有设备未完成执行，例如模拟器启动失败、hdc 未连接、安装失败或测试输出无法解析

具体用例是否通过，请查看 `summary.md` 中每个 suite 下的用例状态，或查看 `result.json` 的 `devices[].suiteResults[].testCases`。

## 折叠屏/旋转控制（可选）

runner 支持自动管理模拟器的折叠/旋转状态。`fold-server.py` 已内置在 `src/` 目录下，
无需额外安装依赖（仅需 Python 3.6+）。

折叠命令（`triggerFold`）仅折叠屏设备可用；旋转命令（`triggerRotation`）所有设备可用。

### 配置步骤

#### 1. 环境变量

构建 HarmonyOS 工程需要设置以下环境变量（加到 `~/.zshrc` 或 `~/.bashrc`）：

```bash
export DEVECO_SDK_HOME="/Applications/DevEco-Studio.app/Contents/sdk"
export JAVA_HOME="/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home"
```

> Windows 路径类似，指向你的 DevEco Studio 安装目录。

#### 2. machine.json 配置

在 `machine.json` 中标记需要控制的设备：

```json
{
  "paths": {
    "hvigorw": "/path/to/hvigorw",
    "hdc": "/path/to/hdc",
    "emulatorBin": "/path/to/Emulator",
    "emulatorDeployedDir": "/path/to/.Huawei/Emulator/deployed",
    "foldServerScript": "src/fold-server.py"
  },
  "devices": [
    {
      "id": "foldable",
      "profile": "Mate X7",
      "target": "127.0.0.1:5555",
      "startEmulator": false,
      "foldControl": true,
      "testSuites": ["CommonPassToPassTest", "FoldControlTest"]
    },
    {
      "id": "phone",
      "profile": "Pura 90",
      "target": "127.0.0.1:15010",
      "startEmulator": false,
      "foldControl": true,
      "testSuites": ["CommonPassToPassTest", "FoldControlTest"]
    }
  ]
}
```

**关键字段说明：**

| 字段 | 说明 |
|------|------|
| `paths.foldServerScript` | fold-server.py 路径，默认使用内置的 `src/fold-server.py` |
| `devices[].profile` | 模拟器实例名，**必须与 `~/.Huawei/Emulator/deployed/` 下的目录名一致**（如 `Mate X7`、`Pura 90`） |
| `devices[].target` | hdc 连接地址，必须与 `hdc list targets` 输出一致 |
| `devices[].foldControl` | `true` 表示该设备启用折叠/旋转控制，runner 会自动启停 fold-server |
| `devices[].testSuites` | 要执行的 suite class 列表，包含折叠测试时需加 `FoldControlTest` |

#### 3. 部署 FoldTrigger.ets 到测试工程

fold-server 控制模拟器的折叠/旋转，测试用例通过 `FoldTrigger.ets` 调用 fold-server。
有两种部署方式：

**方式 A：手动复制（最简单）**

将 `src/FoldTrigger.ets` 复制到测试工程的 ohosTest 目录：

```bash
cp src/FoldTrigger.ets /path/to/your-project/<module>/src/ohosTest/ets/util/FoldTrigger.ets
```

- 默认端口 8765，单设备直接可用
- 多设备场景**无需修改端口**：每台模拟器有独立的 `127.0.0.1` 网络命名空间，通过各自设备的 hdc rport 反向转发到不同的 fold-server 进程，所以所有设备的 `FOLD_SERVER_PORT` 都保持 8765 即可
- 手动复制的文件仅用于编写用例时避免 `import` 报错；若设备配置了 `foldControl: true`，runner 运行前会自动覆盖该文件并填入正确端口（见下方「方式 C」）

**方式 B：使用部署脚本**

```bash
# 默认端口 8765，默认模块路径 entry
npm run deploy:fold -- --project /path/to/your-project

# 指定端口和模块路径（如 entry 在 products/entry 下）
npm run deploy:fold -- --project /path/to/your-project --port 8765 --module products/entry
```

**方式 C：runner 自动部署**

当设备配置了 `foldControl: true` 时，runner 在运行测试前会自动部署 `FoldTrigger.ets`
并重建测试 HAP，无需手动操作。

> **注意：** 自动部署需要在工程里注册测试文件。在 `<module>/src/ohosTest/ets/test/List.test.ets` 中导入并调用：
> ```typescript
> import foldTest from './FoldAbility.test';
> export default function testsuite() {
>   foldTest();
> }
> ```

#### 4. 编写折叠/旋转测试用例

在 `<module>/src/ohosTest/ets/test/` 下创建测试文件（如 `FoldAbility.test.ets`）：

```typescript
import { describe, beforeAll, afterAll, it, expect } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import { triggerFold, triggerRotation, sleep } from '../util/FoldTrigger';

export default function foldTest() {
  describe('FoldControlTest', () => {
    let driver: Driver | undefined;

    beforeAll(async () => {
      driver = Driver.create();
    });

    afterAll(async () => {
      driver = undefined;
    });

    it('trigger_rotation_left', 0, async () => {
      await triggerRotation('left', 2000);
      expect(true).assertTrue();
    });

    it('trigger_rotation_right', 0, async () => {
      await triggerRotation('right', 2000);
      expect(true).assertTrue();
    });

    it('trigger_fold_open', 0, async () => {
      await triggerFold('open', 3000);
      expect(true).assertTrue();
    });

    it('trigger_fold_half_open', 0, async () => {
      await triggerFold('half-open', 3000);
      expect(true).assertTrue();
    });

    it('trigger_fold_close', 0, async () => {
      await triggerFold('close', 3000);
      expect(true).assertTrue();
    });
  });
}
```

> 折叠命令在直板机上会失败（无折叠硬件），旋转命令所有设备可用。

#### 5. 运行

```bash
npm run ohostest:matrix -- --project /path/to/your-project
```

### API 参考

```typescript
import { triggerFold, triggerRotation, triggerLandscapeHover, sleep } from '../util/FoldTrigger';

// 旋转（所有设备可用）
await triggerRotation('left', 2000);
await triggerRotation('right', 2000);

// 折叠（仅折叠屏设备）
await triggerFold('open', 3000);       // 展开
await triggerFold('close', 4000);      // 折叠
await triggerFold('half-open', 3000);  // 半折悬停

// 悬停态校正到横屏（折痕水平）
await triggerLandscapeHover(driver);

// 等待布局稳定
await sleep(1000);
```

| 方法 | 参数 | 说明 | 适用设备 |
|------|------|------|----------|
| `triggerRotation` | `direction: 'left' \| 'right'`, `waitAfter?: number` | 旋转屏幕 | 所有设备 |
| `triggerFold` | `state: 'open' \| 'close' \| 'half-open'`, `waitAfter?: number` | 切换折叠状态 | 仅折叠屏 |
| `triggerLandscapeHover` | `driver: Driver` | 半折态校正到横屏 | 仅折叠屏 |
| `sleep` | `ms: number` | 等待指定毫秒 | 所有设备 |

### 工作原理

```
测试用例 → FoldTrigger.ets → HTTP → hdc rport → fold-server.py → Emulator 命令
```

runner 为每个 `foldControl: true` 的设备自动：

1. 启动独立的 fold-server 实例（自动分配端口，起始 8766），传入 `--target` 支持多设备
2. 等待 fold-server 健康检查通过
3. 部署 `FoldTrigger.ets` 到目标工程（注入该设备对应端口）
4. 重建测试 HAP 使新端口生效
5. 安装 HAP 并执行测试套件
6. 测试结束后停止 fold-server

端口信息记录在 `result.json` 的 `devices[].foldServerPort` 和 `summary.md` 的设备详情中。

### 多设备端口分配

| 设备顺序 | 宿主机端口 | 设备内端口 |
|----------|-----------|-----------|
| 第 1 台 | 8766 | 8765 |
| 第 2 台 | 8767 | 8766 |
| 第 3 台 | 8768 | 8767 |

每台设备拥有独立的 fold-server 进程和端口，互不干扰。

## 故障排查

实际部署时遇到过几个坑，记录在此供对照排查。遇到矩阵返回 `failed` 时，按 build 阶段 → 设备阶段的顺序定位。

### 1. 构建阶段：`Invalid DEVECO_SDK_HOME`

**现象**：`build_failed`，hvigor 报 `Invalid DEVECO_SDK_HOME` 或 `SDK component missing`。

**根因**：`DEVECO_SDK_HOME` 未设置，或路径层级写错。

**关键**：必须指向 `.../sdk`，**不是** `.../sdk/default`：

```bash
# ✅ 正确
export DEVECO_SDK_HOME="/Applications/DevEco-Studio.app/Contents/sdk"
# ❌ 错误（多了一层 default）
export DEVECO_SDK_HOME="/Applications/DevEco-Studio.app/Contents/sdk/default"
```

> 排查技巧：`DEVECO_SDK_HOME` 与环境来源有关，已运行的 hvigor daemon 进程可能持有和当前 shell 不同的值。可读取正在运行的 hvigor daemon 进程的真实环境变量来确认实际生效值，避免被旧 daemon 误导。

### 2. 构建阶段：`Unable to locate Java Runtime`

**现象**：设好 SDK_HOME 后，hvigor 报 `Unable to locate Java Runtime` 或 `Could not find tools.jar`。

**根因**：hvigor 工具链依赖 JDK，还缺 `JAVA_HOME`。DevEco Studio 自带 JBR，直接指向它即可：

```bash
export JAVA_HOME="/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home"
```

> 注意：设好两个环境变量后，若 hvigor daemon 仍在运行旧环境，需先杀掉 daemon 再重跑，否则新变量不生效。

### 3. 设备阶段：`hdc_not_connected` 或设备 profile 不存在

**现象**：`build` 通过但设备阶段报 `hdc_not_connected`，或启动模拟器失败。

**根因**：`machine.json` 中的 `profile` / `target` 与真实环境不符。三个最易踩的点：

1. **`emulatorDeployedDir` 用户名错误**：路径里的用户名（如 `/Users/zzz/...`）必须与当前系统真实用户一致，否则 runner 找不到已部署的模拟器实例。
2. **`profile` 与 deployed 目录名不一致**：`profile` 必须与 `~/.Huawei/Emulator/deployed/` 下的目录名**完全一致**。例如该目录下没有 `Mate X7`，则配 `Mate X7` 必然失败。
3. **`target` 与 hdc 实际连接不符**：用 `hdc list targets` 确认每台设备的真实连接地址，再填入 `target`。

排查命令：

```bash
# 查看已部署的模拟器实例名
ls ~/.Huawei/Emulator/deployed/
# 查看当前 hdc 连接的设备
hdc list targets
```

### 4. 折叠测试失败：折叠命令被设备拒绝

**现象**：`FoldControlTest` 出现 `cannot connect` 或折叠/展开用例失败，但旋转用例能过。

**根因**：`foldControl: true` 的设备必须是**真实可折叠设备/折叠屏模拟器**。若指向的是直板机（如 `Pura 90`、`Mate 80 Pro`），模拟器会拒绝 `-foldedState` 等折叠命令，导致折叠用例失败（旋转用例不受影响，所以可能看到 rotation 通过、fold 失败）。

**解决**：把启用 `foldControl` 的设备 profile 改指向真正的折叠屏实例（如 `Mate X7`、TripleFold），并确认其 `target` 正确。直板机不应启用 `foldControl` 或不应包含 `FoldControlTest`。

### 关于环境变量的注入方式

上述 `DEVECO_SDK_HOME` / `JAVA_HOME` 可加到 `~/.zshrc` 或 `~/.bashrc` 全局生效。需要注意的是：

- runner 通过子进程调用 hvigor，**子进程继承的是 runner 启动时 shell 的环境变量**。
- 如果 hvigor daemon 在旧环境下已启动，它不会感知新设的变量——**改完环境变量后务必先终止 hvigor daemon 再重跑**。
- 实际部署中可借助读取 hvigor daemon 进程的真实环境变量来排查「设了但没生效」的情况。



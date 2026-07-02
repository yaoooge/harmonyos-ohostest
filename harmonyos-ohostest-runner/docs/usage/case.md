# case 目录执行

case 模式以 `case/` 目录为输入，执行两轮矩阵测试：

```text
base_project + test_patch    -> swe
base_project + test_patch + golden_patch -> answer
```

## 命令

```bash
npm run ohostest:case -- \
  --case /path/to/ResponsiveRepeatLayout/case
```

参数：

```text
--case <path>                 case 目录，必填
--machine-config <path>       设备矩阵配置文件，默认 config/machine.json
--out <path>                  指定 case 级 result.json 输出路径
--skip-build true|false       是否跳过构建
--keep-emulators true|false   运行结束后是否保留模拟器
--keep-workdir true|false     是否保留合成工程目录，默认 false
```

case 模式不接收 `--device` 和 `--test-class`。设备和 suite 选择只来自 case 配置与 `machine.json`。

## 输入目录

case 目录包含：

```text
case/
  metadata.json
  test_patch.patch
  golden_patch.patch
  <base_project>/
```

`metadata.json` 字段：

| 字段 | 说明 |
|------|------|
| `case_id` | case 标识 |
| `base_project` | 基线工程目录名。运行器按 `<case>/<base_project>`、`<case>/../<base_project>` 顺序解析 |
| `test_patch` | 测试 patch 文件名 |
| `golden_patch` | 答案 patch 文件名 |
| `pass_to_pass` | pass-to-pass 用例名列表 |
| `fail_to_pass` | fail-to-pass 用例名列表 |
| `device_test_suites` | 可选。设备到 suite class 的映射 |
| `enabled_devices` | 可选。没有 `device_test_suites` 时，声明要执行全量测试的设备 |

`device_test_suites` 示例：

```json
{
  "phone": [
    {
      "suite": "CommonPassToPassTest",
      "file": "products/entry/src/ohosTest/ets/test/CommonPassToPass.test.ets"
    }
  ],
  "tablet": [
    {
      "suite": "LgFailToPassTest",
      "file": "products/entry/src/ohosTest/ets/test/LgFailToPass.test.ets"
    }
  ]
}
```

`enabled_devices` 示例：

```json
["phone", "foldable"]
```

## 配置来源

case 模式使用 `machine.json` 中的机器相关配置：

- 工具路径：`paths.hvigorw`、`paths.ohpm`、`paths.hdc`、`paths.emulatorBin`、`paths.emulatorDeployedDir`、`paths.foldServerScript`
- 设备连接信息：`devices[].id`、`profile`、`target`、`hdcPort`、`startEmulator`、`foldControl`
- HarmonyOS 工程覆盖项：`product`、`module`、`bundleName`、`testModule`、`testRunner`、`timeoutMs`、`build`、`artifacts`

case 模式按以下优先级决定设备与 suite：

1. 有 `metadata.device_test_suites` 时，按该字段选择设备和 suite class。
2. 无 `device_test_suites`、有 `metadata.enabled_devices` 时，按 enabled 设备执行全量测试。
3. 两者都没有时，按 `machine.json.devices` 中全部设备执行全量测试。

全量测试表示不传 suite class 过滤条件。`machine.json` 中的 `devices[].testSuites` 不参与 case 模式的全量测试选择。

## 执行流程

1. 读取 `metadata.json`。
2. 复制 `base_project` 到输出目录下的 `work/project`。
3. 在 `work/project` 应用 `test_patch`。
4. 使用 case 设备选择结果调用矩阵运行，矩阵构建阶段会先执行 `ohpm install`，输出到 `swe/result.json`。
5. 在同一个 `work/project` 继续应用 `golden_patch`。
6. 再次调用矩阵运行，矩阵构建阶段会先执行 `ohpm install`，输出到 `answer/result.json`。
7. 写入 case 级 `result.json` 和 `summary.md`。
8. `--keep-workdir` 为 `false` 时删除 `work/`。

## 输出结果

默认输出目录：

```text
<case>/.ohostest-runs/<timestamp>/
  result.json
  summary.md
  swe/
    result.json
    summary.md
    commands.log
    devices/
  answer/
    result.json
    summary.md
    commands.log
    devices/
  work/
    project/
```

`--keep-workdir false` 时，运行结束后删除 `work/`。

case 级 `result.json` 使用 `ohostest-case-v1` schema，包含：

- `caseId`
- `caseDir`
- `baseProject`
- `status`
- `metadata.passToPass`
- `metadata.failToPass`
- `metadata.deviceTestSuites`
- `runs.swe`
- `runs.answer`
- `artifacts`
- `diagnostics`

case 级 `summary.md` 包含：

- `Runs`：swe 和 answer 两轮总体统计
- `Device Results`：每台设备分别列出 `pass_to_pass` 和 `fail_to_pass`
- `Totals`：按 `pass_to_pass` 和 `fail_to_pass` 汇总 swe/answer 的通过与失败数量
- `Device Suites`：metadata 中的设备 suite 列表
- `Pass To Pass`：metadata 中的 pass-to-pass 用例名
- `Fail To Pass`：metadata 中的 fail-to-pass 用例名
- `Diagnostics`：存在诊断信息时输出

`Device Results` 的表格结构：

```markdown
### foldable

#### pass_to_pass

| Suite | SWE | Answer | Expected | Verdict |
| --- | --- | --- | --- | --- |
| CommonPassToPassTest | passed, 8/8 | passed, 8/8 | SWE pass, Answer pass | correct |

#### fail_to_pass

| Suite | SWE | Answer | Expected | Verdict |
| --- | --- | --- | --- | --- |
| MdFailToPassTest | failed, 0/2, failures=2 | passed, 2/2 | SWE fail, Answer pass | correct |
```

suite class 名称包含 `FailToPass` 时归入 `fail_to_pass`。其他 suite class 归入 `pass_to_pass`。

## 状态

case 级 `status`：

- `completed`：swe 和 answer 两轮矩阵运行均完成，且没有 case 级诊断信息
- `failed`：缺少任一轮结果、任一轮矩阵状态为 failed，或存在 case 级诊断信息

矩阵级 `status` 的含义与矩阵模式一致。suite failure 不会使矩阵级 `status` 变为 failed；设备 blocked 会使矩阵级 `status` 变为 failed。

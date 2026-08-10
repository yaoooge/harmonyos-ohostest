# SWE 平板兼容模式规避设计

## 背景与目标

case 模式执行 SWE 工程时，如果入口模块的 `src/main/module.json5` 中 `module.deviceTypes` 不包含 `tablet`，应用在平板设备上会进入兼容模式，导致 UI 测试结果不能反映真实的平板布局。

runner 需要在 SWE 的平板矩阵执行期间，临时为入口模块增加 `tablet` 设备类型。该调整只用于消除测试基础设施带来的兼容模式，不属于题目答案的一部分，不能永久修改 base project，也不能影响 Answer 工程或 golden patch。

## 适用条件

只有同时满足以下条件时才启用临时调整：

1. case 运行范围为 `swe` 或 `all`；
2. case 经过 metadata、machine config 和 CLI `--device` 筛选后的设备列表包含 ID 为 `tablet` 的设备。

以下情况不修改工程：

- `answer` 模式；
- SWE 最终只执行 phone、foldable 或其他非 `tablet` ID 的设备；
- 入口模块的 `module.deviceTypes` 已包含 `tablet`。

本版本以 runner 的规范设备 ID `tablet` 作为触发条件，不新增 machine config 字段，也不尝试从 profile 名称或屏幕尺寸推断设备类型。

## 方案选择

采用“SWE 执行期间临时修改并恢复”方案：保存入口模块配置的原始内容，写入带 `tablet` 的临时配置，执行 SWE 矩阵，然后在 `finally` 中恢复原始内容。

不采用以下方案：

- 修改后不恢复：会污染 Answer 工程，并可能导致后续 golden patch 因上下文变化而无法应用。
- 为 SWE 和 Answer 建立两份独立 work project：隔离更强，但需要重构当前单工作目录编排并增加复制成本，超出本问题范围。

## 模块边界

新增聚焦模块：

```text
harmonyos-ohostest-runner/src/case/deviceCompatibility.ts
```

该模块负责：

- 从工程根目录的 `build-profile.json5` 定位入口模块；
- 读取和校验入口模块的 `src/main/module.json5`；
- 在需要时临时追加 `tablet`；
- 在回调结束后恢复原始文件。

建议接口：

```ts
export async function withSweTabletCompatibility<T>(input: {
  project: string;
  enabled: boolean;
  run: () => Promise<T>;
}): Promise<T>;
```

当 `enabled` 为 `false` 或配置已包含 `tablet` 时，函数直接执行并返回 `run()` 的结果。调用方不接触文件备份和恢复细节。

入口模块定位应沿用 matrix 工程发现逻辑的规则：优先选择 `build-profile.json5` 中名称为 `entry` 的模块，其次选择 `srcPath` 包含 `entry` 的模块，最后使用第一个模块。为避免两套规则漂移，应将现有入口模块选择逻辑提取为可复用函数，而不是在 case 模块中复制一份。

## 配置修改规则

目标文件为：

```text
<project>/<entry srcPath>/src/main/module.json5
```

处理步骤：

1. 读取文件并保存原始字符串；
2. 使用现有 `parseJson5ish` 解析配置；
3. 校验 `module.deviceTypes` 是字符串数组；
4. 如果数组已包含 `tablet`，不写文件并执行回调；
5. 否则将 `tablet` 追加到数组末尾；
6. 使用 JSON 格式写回临时 work project；HarmonyOS 的 JSON5 配置兼容标准 JSON；
7. 执行回调；
8. 在 `finally` 中用第 1 步保存的原始字符串完整恢复文件。

临时写回可以移除注释和改变格式，因为文件位于可丢弃的 work project 中；最终恢复使用原始字符串，确保保留原有注释、空白和换行。

不修改以下文件：

- 入口模块的 `src/ohosTest/module.json5`，该文件继续由 case 的 test patch 负责；
- HAR/HSP 等依赖模块的 `module.json5`；
- base project、test patch 或 golden patch 原文件。

## Case 编排时序

现有 case 流程调整为：

```text
复制 base project
  → 应用 test_patch
  → 加载 matrix config 并计算最终设备选择
  → runMode 包含 SWE
      → withSweTabletCompatibility(enabled = devices.includes("tablet"))
          → 执行 SWE matrix
          → 恢复入口 module.json5
  → runMode 包含 Answer
      → 应用 golden_patch
      → 执行 Answer matrix
```

SWE matrix 返回 `failed` 结果时仍属于正常回调返回，随后恢复文件。SWE matrix 抛出异常时也必须先恢复，再由现有 case 顶层错误处理记录诊断。

`--run all` 中，golden patch 只能在恢复成功后应用。恢复失败时停止执行 Answer，避免在未知或被污染的工程状态上生成报告。

## 错误处理

以下情况抛出包含稳定错误前缀和具体路径的错误，并由 case runner 写入 diagnostics：

- `build-profile.json5` 缺少可用模块；
- 入口模块 `srcPath` 无法解析；
- 目标 `module.json5` 不存在或无法读取；
- `module.deviceTypes` 不存在、不是数组，或包含非字符串项；
- 临时文件写入失败；
- 原始文件恢复失败。

配置结构非法时不自动创建 `deviceTypes`，因为无法确认该工程是否使用受支持的 HarmonyOS 模块结构。恢复失败优先于回调原始异常报告，错误信息应明确指出恢复失败；如同时存在回调异常，可将其信息附加到恢复错误中，避免丢失根因。

## 可观测性

不修改 case 或 matrix 报告 schema。无需把临时文件内容写入报告。

失败通过现有 `CaseResult.diagnostics` 暴露。单元测试和 case runner 测试验证调整是否发生及恢复顺序，避免依赖真实模拟器观察文件修改。

## 测试策略

遵循测试驱动开发，先写失败测试：

1. `deviceCompatibility` 单元测试：缺少 `tablet` 时，回调执行期间配置包含 `tablet`，回调结束后文件与原始字符串完全一致。
2. 已包含 `tablet` 时不重写文件，并正常返回回调结果。
3. `enabled=false` 时不解析或改写目标文件，直接执行回调。
4. 回调抛出异常时仍恢复原始文件，并向调用方重新抛出原异常。
5. `deviceTypes` 缺失、类型错误或包含非字符串项时返回描述性错误。
6. case runner 测试：SWE 选择 tablet 时启用临时调整，选择 phone 时不启用。
7. case runner 测试：Answer-only 即使选择 tablet 也不修改入口模块。
8. case runner 测试：`run all` 时，入口模块已在应用 golden patch 前恢复，从而保证 Answer 不继承 SWE 临时配置。
9. 完成后运行 runner 全量单元测试、TypeScript 构建和 lint。

本功能不要求真实模拟器验证。它改变的是合成工程构建前的声明配置与生命周期管理；核心正确性可由文件级单元测试和 case 编排测试稳定覆盖。后续若进行设备验收，应以平板 SWE 不进入兼容模式且测试结果与原生平板窗口一致作为验收标准。

## 非目标

- 不自动修改提交到 case 中的 SWE/base 工程。
- 不修改 Answer 工程的设备声明。
- 不为非 `tablet` 设备 ID 推断设备类别。
- 不扩展 metadata 或 machine config schema。
- 不处理与 `deviceTypes` 无关的平板适配问题。

# Case 模式设备过滤设计

## 目标

为 `harmonyos-ohostest-runner` 的 case 模式增加可重复的 `--device <id>` 参数，使调用方能够只在指定的模拟器设备上执行 case，例如仅执行 `phone` 或 `tablet`。

## 命令行接口

case 模式接受一个或多个 `--device`：

```bash
npm run ohostest:case -- \
  --case ../ResponsiveRepeatLayout/case \
  --device phone
```

```bash
npm run ohostest:case -- \
  --case ../ResponsiveRepeatLayout/case \
  --device phone \
  --device tablet
```

未传 `--device` 时保持现有行为，执行 case 配置所选择的全部设备。`--test-class` 仍不在 case 模式开放，suite 选择继续由 case metadata 决定。

## 设备选择规则

case 允许的设备集合继续按现有优先级生成：

1. 有 `metadata.device_test_suites` 时，使用其键集合，并保留每台设备对应的 suite 覆盖。
2. 否则有 `metadata.enabled_devices` 时，使用该设备列表并执行全量 suite。
3. 两者都没有时，使用 `machine.json.devices` 中的全部设备并执行全量 suite。

若 CLI 提供 `--device`，则在上述集合生成后按 CLI 顺序筛选：

- 每个 CLI 设备必须属于 case 允许的设备集合，否则抛出描述性错误。
- 重复的 CLI 设备去重，保留首次出现的顺序。
- 筛选后只保留所选设备的 suite 覆盖。
- SWE 和 Answer 阶段复用同一设备选择结果。

机器配置校验仍由现有 case 设备选择逻辑负责。因此，即使 CLI 只选择 `phone`，metadata 声明但 `machine.json` 缺失的其他设备仍会按现有规则触发配置错误，避免通过 CLI 掩盖无效 case 配置。

## 实现边界

- `src/cli/parseCaseArgs.ts`：识别可重复的 `--device` 并写入 `RunCaseInput.devices`。
- `src/case/types/index.ts`：为 case 运行输入增加可选设备列表。
- `src/case/config.ts`：在现有 metadata/machine 设备选择之后应用 CLI 过滤。
- `src/case/runner.ts`：把输入设备列表传给设备选择函数；底层 matrix runner 保持不变。
- README 与 case 使用文档：删除“不支持 `--device`”的说明并增加单设备、多设备示例。
- `package.json` 与 `CHANGELOG.md`：发布补丁版本 `0.1.2`，记录 case 模式设备过滤能力。

不改变 metadata 格式、machine 配置格式、suite 选择规则、报告 schema 或 matrix 模式行为。

## 错误处理

- `--device` 缺少取值时，沿用通用的“参数缺少取值”错误。
- 任一 CLI 设备不在 case 允许集合中时，在开始 SWE/Answer 设备执行前失败，错误信息包含非法设备 ID。
- 多个 CLI 设备中只要存在一个非法值，整个 case 运行失败，不静默忽略。

## 测试策略

遵循测试驱动开发，先增加失败测试，再编写最小实现：

1. CLI 测试验证单个与多个 `--device` 的解析结果，并替换当前“拒绝设备过滤”测试。
2. case config 测试覆盖 `device_test_suites`、`enabled_devices` 和默认 machine 全设备三种来源的筛选。
3. case config 测试验证顺序、去重、suite 覆盖裁剪和非法设备错误。
4. case runner 测试验证 SWE 与 Answer 均只把筛选后的设备传给 matrix runner 所产生的结果。
5. 运行 runner 的单元测试、类型构建和 lint，确认没有回归。

实现和验证完成后，将 runner 版本从 `0.1.1` 更新为 `0.1.2`，并在 changelog 中增加 `2026-07-16` 的功能条目。

本功能不要求真实模拟器验证：它只改变 runner 的参数解析和纯配置选择，设备命令执行路径仍由现有 matrix 测试覆盖。

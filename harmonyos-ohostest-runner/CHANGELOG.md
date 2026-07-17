# 更新日志

本项目的所有重要变更都会记录在此文件中。

本文档格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
本项目遵循[语义化版本](https://semver.org/spec/v2.0.0.html)。

## [0.1.2] - 2026-07-16

### 新增

- case 模式支持可重复的 `--device <id>` 参数，可只执行 case 配置允许的指定设备，例如 `phone` 或 `tablet`。
- 指定不属于 case 设备集合的 ID 时，在执行设备矩阵前返回明确错误。

### 修复

- case 模式在平板执行 SWE 时，临时为入口模块的 `module.deviceTypes` 增加 `tablet`，避免应用进入兼容模式而影响 UI 测试准确性。
- SWE 执行结束或异常后恢复原始 `module.json5`，确保 Answer 和 golden patch 不受临时配置影响。

## [0.1.1] - 2026-07-16

### 修复

- 安装应用和测试 HAP 前，先卸载配置中指定的应用包，避免在同一设备上重复安装相同包名应用时出现 HDC 错误 `9568267`（`install entry already exist`）。
- 忽略安装前卸载失败，确保设备上尚未安装对应应用时仍能继续执行首次安装。
- 支持解析 JSON5 文件中的单引号键和值。

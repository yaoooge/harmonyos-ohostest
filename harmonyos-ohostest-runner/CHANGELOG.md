# 更新日志

本项目的所有重要变更都会记录在此文件中。

本文档格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
本项目遵循[语义化版本](https://semver.org/spec/v2.0.0.html)。

## [0.1.1] - 2026-07-16

### 修复

- 安装应用和测试 HAP 前，先卸载配置中指定的应用包，避免在同一设备上重复安装相同包名应用时出现 HDC 错误 `9568267`（`install entry already exist`）。
- 忽略安装前卸载失败，确保设备上尚未安装对应应用时仍能继续执行首次安装。

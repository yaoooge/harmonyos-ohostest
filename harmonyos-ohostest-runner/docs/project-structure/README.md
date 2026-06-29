# 工程结构说明

`harmonyos-ohostest-runner/src` 按功能分为三个区域：矩阵测试执行、折叠屏处理、共享基础能力。

```text
src/
  index.ts
  cli/
    parseArgs.ts
  matrix/
    build.ts
    config.ts
    device.ts
    ohostest.ts
    result.ts
    runner.ts
    types/
      index.ts
    utils/
      json5ish.ts
      projectDiscovery.ts
  fold/
    server.ts
    foldTriggerTemplate.ts
    assets/
      FoldTrigger.ets
      fold-server.py
    types/
    utils/
  shared/
    command.ts
    types/
      command.ts
      index.ts
    utils/
      file.ts
      names.ts
      shellQuote.ts
      sleep.ts
```

## 入口层

- `src/index.ts`：包级公共出口，导出 CLI 参数解析、矩阵运行 API 和公共类型。
- `src/cli/parseArgs.ts`：解析 `ohostest:matrix` 命令行参数，生成 `RunMatrixInput`。

## 矩阵测试执行

- `matrix/runner.ts`：矩阵运行主编排。负责加载配置、创建输出目录、记录命令日志、依次运行设备、写入结果文件。
- `matrix/build.ts`：执行 app HAP 和 ohosTest HAP 构建，校验构建产物，并返回构建阶段结果。
- `matrix/config.ts`：读取 `machine.json`，合并 HarmonyOS 工程发现信息，生成标准化 `MatrixConfig`。
- `matrix/device.ts`：处理设备连接、模拟器启停命令、设备唤醒、HAP 安装、设备日志写入。
- `matrix/ohostest.ts`：构造 `aa test` 命令，解析 `OHOS_REPORT_*` 测试输出。
- `matrix/result.ts`：生成矩阵状态和 `summary.md`。
- `matrix/types/index.ts`：矩阵配置、运行输入、构建结果、设备结果、suite 结果和用例结果类型。
- `matrix/utils/json5ish.ts`：解析 HarmonyOS 工程中的 JSON5 风格配置文本。
- `matrix/utils/projectDiscovery.ts`：读取目标 HarmonyOS 工程信息，包括 product、entry module、bundle name、ohosTest module 和 HAP 路径。

## 折叠屏处理

- `fold/server.ts`：启动和停止 fold-server，执行健康检查，部署 `FoldTrigger.ets` 到目标工程。
- `fold/foldTriggerTemplate.ts`：生成注入设备端口后的 `FoldTrigger.ets` 内容。
- `fold/assets/fold-server.py`：宿主机 HTTP 服务，接收折叠/旋转请求并调用 DevEco Emulator 命令。
- `fold/assets/FoldTrigger.ets`：可手动复制到测试工程的设备端触发工具。
- `fold/types/`：折叠屏处理相关类型目录。
- `fold/utils/`：折叠屏处理工具目录。

## 共享能力

- `shared/command.ts`：命令执行、detached 进程启动和命令日志记录。
- `shared/types/command.ts`：命令执行结果和命令执行器类型。
- `shared/utils/file.ts`：文件存在性校验。
- `shared/utils/names.ts`：日志文件名等场景使用的名称清洗。
- `shared/utils/shellQuote.ts`：跨平台 shell 参数转义。
- `shared/utils/sleep.ts`：异步等待工具。

## 调用关系

```text
scripts/runOhosTestMatrix.ts
  -> src/index.ts
  -> cli/parseArgs.ts
  -> matrix/runner.ts
     -> matrix/config.ts
     -> matrix/build.ts
     -> matrix/device.ts
     -> matrix/ohostest.ts
     -> matrix/result.ts
     -> fold/server.ts
     -> shared/command.ts
```

矩阵执行是主流程，折叠屏处理是按设备启用的可选能力。共享层不依赖 `matrix/` 或 `fold/`。

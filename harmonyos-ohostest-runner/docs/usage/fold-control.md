# 折叠屏和旋转控制

runner 支持自动管理模拟器的折叠/旋转状态。折叠命令仅折叠屏设备可用，旋转命令所有设备可用。

## 组件

```text
测试用例
  -> FoldTrigger.ets
  -> HTTP
  -> hdc rport
  -> fold-server.py
  -> Emulator 命令
```

相关文件：

- `src/fold/assets/fold-server.py`：宿主机 HTTP 服务
- `src/fold/assets/FoldTrigger.ets`：设备端工具文件
- `src/fold/foldTriggerTemplate.ts`：runner 自动部署时使用的模板

## machine.json 配置

在 `machine.json` 中标记需要控制的设备：

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
      "id": "foldable",
      "profile": "Mate X7",
      "target": "127.0.0.1:5555",
      "startEmulator": false,
      "foldControl": true,
      "testSuites": ["CommonPassToPassTest", "FoldControlTest"]
    }
  ]
}
```

关键字段：

| 字段 | 说明 |
|------|------|
| `paths.foldServerScript` | fold-server.py 路径 |
| `devices[].profile` | 模拟器实例名，必须与 `~/.Huawei/Emulator/deployed/` 下的目录名一致 |
| `devices[].target` | hdc 连接地址，必须与 `hdc list targets` 输出一致 |
| `devices[].foldControl` | `true` 表示该设备启用折叠/旋转控制 |
| `devices[].testSuites` | 要执行的 suite class 列表，包含折叠测试时加入 `FoldControlTest` |

## 部署 FoldTrigger.ets

手动复制：

```bash
cp src/fold/assets/FoldTrigger.ets /path/to/your-project/<module>/src/ohosTest/ets/util/FoldTrigger.ets
```

使用部署脚本：

```bash
npm run deploy:fold -- --project /path/to/your-project
npm run deploy:fold -- --project /path/to/your-project --port 8765 --module products/entry
```

runner 自动部署：

当设备配置了 `foldControl: true` 时，runner 在运行测试前会自动部署 `FoldTrigger.ets`，并重建测试 HAP。

自动部署需要在工程里注册测试文件。在 `<module>/src/ohosTest/ets/test/List.test.ets` 中导入并调用：

```typescript
import foldTest from './FoldAbility.test';

export default function testsuite() {
  foldTest();
}
```

## 测试用例示例

在 `<module>/src/ohosTest/ets/test/` 下创建测试文件：

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

## API

```typescript
import { triggerFold, triggerRotation, triggerLandscapeHover, sleep } from '../util/FoldTrigger';

await triggerRotation('left', 2000);
await triggerRotation('right', 2000);

await triggerFold('open', 3000);
await triggerFold('close', 4000);
await triggerFold('half-open', 3000);

await triggerLandscapeHover(driver);
await sleep(1000);
```

| 方法 | 参数 | 说明 | 适用设备 |
|------|------|------|----------|
| `triggerRotation` | `direction: 'left' \| 'right'`, `waitAfter?: number` | 旋转屏幕 | 所有设备 |
| `triggerFold` | `state: 'open' \| 'close' \| 'half-open'`, `waitAfter?: number` | 切换折叠状态 | 折叠屏 |
| `triggerLandscapeHover` | `driver: Driver` | 半折态校正到横屏 | 折叠屏 |
| `sleep` | `ms: number` | 等待指定毫秒 | 所有设备 |

## 自动管理流程

runner 为每个 `foldControl: true` 的设备自动：

1. 启动独立的 fold-server 实例，自动分配端口，起始 8766，并传入 `--target`
2. 等待 fold-server 健康检查通过
3. 部署 `FoldTrigger.ets` 到目标工程，并注入该设备对应端口
4. 重建测试 HAP
5. 安装 HAP 并执行测试套件
6. 测试结束后停止 fold-server

端口信息记录在 `result.json` 的 `devices[].foldServerPort` 和 `summary.md` 的设备详情中。

端口分配：

| 设备顺序 | 宿主机端口 | 设备内端口 |
|----------|-----------|-----------|
| 第 1 台 | 8766 | 8765 |
| 第 2 台 | 8767 | 8766 |
| 第 3 台 | 8768 | 8767 |

每台设备拥有独立的 fold-server 进程和端口，互不干扰。

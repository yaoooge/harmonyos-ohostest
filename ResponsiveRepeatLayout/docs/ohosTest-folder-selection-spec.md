# ohosTest 多设备用例重分组与 runner 文件夹选择 Spec

## 目标

将 `ResponsiveRepeatLayout` 当前 ohosTest 用例从单层 `passtopass` / `failtopass` 重组为“多设备通用 + 断点专属”的目录结构，并增强 `harmonyos-ohostest-runner`，使配置 JSON 可以为不同设备选择要运行的测试文件夹。

该分组用于 SWE bench 用例：应用代码已剥离多设备适配能力后，通用行为和小屏基线用例仍应通过，断点适配相关的 failtopass 用例应在目标设备上失败，暴露 LLM 是否能补回多设备适配代码。

## 范围

涉及两个工程目录：

- 应用测试目录：`ResponsiveRepeatLayout/products/entry/src/ohosTest/ets/test`
- runner 目录：`harmonyos-ohostest-runner`

不在本 spec 范围内：

- 不修改当前应用业务逻辑。
- 不改变已剥离的多设备适配代码。
- 不重新定义断点行为。断点预期以当前测试断言和原始一多实现为准。

## 断点预期原则

断点分类沿用 `TestHelper.ets` 当前逻辑：

- `sm`：窗口宽度 `< 600`
- `md`：窗口宽度 `>= 600 && < 840`
- `lg`：窗口宽度 `>= 840`

迁移规则：

- `common` 只放不依赖断点的基础交互与可见性用例。
- `sm` 只放小屏专属断言。
- `md` 是独立断点，不与 `sm` 合并。
- `lg` 只放大屏专属断言。
- 断点专属用例内部仍需读取运行时断点；当当前设备不属于目标断点时显式跳过并通过。
- 用例断言以当前恢复后的测试文件为准；必要时对照已删除的一多代码确认预期。

已确认的原始一多行为：

- 主 Tab：`lg` 为左侧垂直 Tab；`sm` / `md` 为底部 Tab。
- 首页普通 WaterFlow：`sm` 为 2 列，`md` 为 3 列，`lg` 为 4 列。当前断言可继续使用 `md || lg` 时 `lanes > 2`。
- 首页 Grid 模式 WaterFlow：`lg` 为 2 列；`sm` / `md` 为 1 列。
- 分类页商品 Grid：`sm` 为 2 列，`md` / `lg` 为 4 列。
- 分类页左侧列表：`md` / `lg` 存在最大宽度约束，预期不超过 240vp。
- 购物车列表：`lg` 为 2 lane；`sm` / `md` 为 1 lane。
- Profile 页面：`lg` 为用户区和菜单区分栏，子菜单 2 lane；`sm` / `md` 为纵向布局，子菜单 1 lane。

## 目标目录结构

```text
products/entry/src/ohosTest/ets/test/
├── List.test.ets
├── TestHelper.ets
├── common/
│   └── CommonPassToPass.test.ets
├── sm/
│   └── SmPassToPass.test.ets
├── md/
│   └── MdFailToPass.test.ets
└── lg/
    └── LgFailToPass.test.ets
```

说明：

- 目录只按设备能力分组；pass/fail 类型由文件名与 suite 名表达。
- 当前约束下，`common` 和每个单断点目录最多只有一个 `passtopass` suite 与一个 `failtopass` suite，因此不再创建二级 `passtopass` / `failtopass` 目录。
- 每个设备能力目录内部直接聚合为一个 Hypium suite，避免 runner 再维护二次数组展开。
- `List.test.ets` 仍作为 Hypium 聚合入口，导入并注册所有聚合 suite。runner 通过 `aa test -s class <suiteName>` 选择具体 suite。

## 用例迁移映射

### common / passtopass

来源：当前 `Ability.test.ets` 与原 `passtopass/*` 中不依赖断点的用例。

目标 suite：`CommonPassToPassTest`

用例清单：

- `should_start_ability_successfully`
- `should_show_home_tab_content_after_app_launch`
- `should_show_search_bar_on_home_page`
- `should_show_home_waterflow_product_items`
- `should_switch_to_category_tab_and_show_category_content`
- `should_show_category_side_list_and_product_area`
- `should_switch_to_cart_tab_and_show_cart_content`
- `should_show_cart_product_list_or_empty_state`
- `should_switch_to_profile_tab_and_show_profile_content`
- `should_show_profile_order_and_menu_sections`

### sm / passtopass

来源：当前 `passtopass/*` 中 `breakpoint === 'sm'` 的断点断言。

目标 suite：`SmPassToPassTest`

用例清单：

- `should_place_tab_bar_at_bottom_on_small_breakpoint`
- `should_show_home_waterflow_as_two_columns_on_small_breakpoint`
- `should_show_category_products_as_two_columns_on_small_breakpoint`
- `should_show_cart_list_as_one_lane_on_small_breakpoint`
- `should_show_profile_sections_as_vertical_layout_on_small_breakpoint`
- `should_show_profile_sub_menu_as_one_lane_on_small_breakpoint`

### md / failtopass

来源：当前 `failtopass/*` 中 `breakpoint === 'md' || breakpoint === 'lg'` 且 md 有独立一多预期的断言。

目标 suite：`MdFailToPassTest`

用例清单：

- `should_show_home_waterflow_as_multi_column_layout_on_medium_breakpoint`
  - 预期：md 首页 WaterFlow 为多列布局；原一多代码中普通 WaterFlow 为 3 列。
- `should_keep_home_waterflow_items_visible_without_horizontal_overflow_on_medium_breakpoint`
  - 预期：md 下商品流 item 不发生水平溢出。
- `should_keep_category_left_list_within_expected_width_on_medium_breakpoint`
  - 预期：md 下分类左侧列表宽度不超过 240vp。
- `should_show_category_products_as_four_columns_on_medium_breakpoint`
  - 预期：md 下分类商品 Grid 为 4 列。
- `should_keep_cart_control_panel_visible_without_covering_list_content_on_medium_breakpoint`
  - 预期：md 下购物车控制面板可见，且不遮挡主要列表内容。

### lg / failtopass

来源：当前 `failtopass/*` 中 `breakpoint === 'lg'` 的断言，以及 `md || lg` 中 lg 同样需要覆盖的断言。

目标 suite：`LgFailToPassTest`

用例清单：

- `should_place_tab_bar_at_side_on_large_breakpoint`
- `should_show_home_waterflow_as_multi_column_layout_on_large_breakpoint`
- `should_keep_home_waterflow_items_visible_without_horizontal_overflow_on_large_breakpoint`
- `should_keep_category_left_list_within_expected_width_on_large_breakpoint`
- `should_show_category_products_as_four_columns_on_large_breakpoint`
- `should_show_cart_list_as_two_lanes_on_large_breakpoint`
- `should_keep_cart_control_panel_visible_without_covering_list_content_on_large_breakpoint`
- `should_show_profile_user_area_and_menu_area_as_split_layout_on_large_breakpoint`
- `should_show_profile_sub_menu_as_two_lanes_on_large_breakpoint`

## runner 配置契约

在 `harmonyos-ohostest-runner/config/machine.json` 中新增顶层字段 `testFolders`，并允许每个设备声明要运行的文件夹。每个文件夹配置直接指向一个聚合 suite class。

示例：

```json
{
  "paths": {
    "hvigorw": "/Users/guoyutong/command-line-tools/bin/hvigorw",
    "hdc": "/Users/guoyutong/command-line-tools/sdk/default/openharmony/toolchains/hdc",
    "emulatorBin": "/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator",
    "emulatorDeployedDir": "/Users/guoyutong/.Huawei/Emulator/deployed"
  },
  "testFolders": {
    "common": "CommonPassToPassTest",
    "sm": "SmPassToPassTest",
    "md": "MdFailToPassTest",
    "lg": "LgFailToPassTest"
  },
  "devices": [
    {
      "id": "phone",
      "profile": "Mate 80 Pro",
      "target": "127.0.0.1:15001",
      "hdcPort": 15001,
      "startEmulator": true,
      "testFolders": ["common", "sm"]
    },
    {
      "id": "foldable",
      "profile": "Mate X7",
      "target": "127.0.0.1:15002",
      "hdcPort": 15002,
      "startEmulator": true,
      "testFolders": ["common", "sm", "md"]
    },
    {
      "id": "tablet",
      "profile": "MatePad Pro 13",
      "target": "127.0.0.1:15003",
      "hdcPort": 15003,
      "startEmulator": true,
      "testFolders": ["common", "md", "lg"]
    }
  ]
}
```

runner 行为要求：

- 当设备配置了 `testFolders` 时，runner 根据顶层 `testFolders` 映射解析出 suite class 列表。
- 每个 suite class 单独执行一次 `aa test -s class <suiteName>`。
- 同一设备选择多个文件夹时，按设备 `testFolders` 顺序运行；如果多个文件夹映射到同一个 class，class 去重后只运行一次。
- `--test-class <suiteName>` CLI 参数优先级最高；指定后仅运行该 class，忽略设备的 `testFolders`。
- 未配置设备 `testFolders` 且未指定 `--test-class` 时，保持兼容行为：运行完整测试模块。
- 如果设备引用了未在顶层 `testFolders` 中声明的文件夹，配置加载失败，并输出可读错误。
- 如果某个文件夹映射为空字符串或非字符串值，配置加载失败，避免设备静默不跑测试。

## runner 结果聚合要求

当一个设备运行多个 suite class 时：

- `testsRun`、`failures`、`errors`、`passes`、`ignored` 需要按 class 聚合。
- 任意 class 执行失败或 `OHOS_REPORT_CODE` 非 0，则设备最终状态为失败。
- 日志中需要记录每次执行的 suite class，便于定位失败来源。
- runner 结果模型需要保留 suite 维度明细，记录每个设备实际执行了哪些 suite，以及每个 suite 的独立结果。
- summary 中需要同时展示设备聚合结果和 suite 明细结果。

建议结果结构：

```ts
interface SuiteRunResult {
  suiteClass: string;
  testsRun: number;
  failures: number;
  errors: number;
  passes: number;
  ignored: number;
  reportCode: number | null;
  ok: boolean;
  outputFile?: string;
}

interface DeviceRunResult {
  deviceId: string;
  status: 'passed' | 'failed' | 'blocked';
  testsRun: number;
  failures: number;
  errors: number;
  passes: number;
  ignored: number;
  suiteResults: SuiteRunResult[];
}
```

summary 输出格式要求：

```markdown
| Device | Status | Suites | Tests | Failures | Errors | Passes | Ignored |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| phone | passed | 2 | 12 | 0 | 0 | 12 | 0 |
| foldable | failed | 3 | 17 | 3 | 0 | 14 | 0 |
| tablet | failed | 3 | 19 | 7 | 0 | 12 | 0 |

### phone

| Suite | Status | Tests | Failures | Errors | Passes | Ignored | Report |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CommonPassToPassTest | passed | 10 | 0 | 0 | 10 | 0 | 0 |
| SmPassToPassTest | passed | 2 | 0 | 0 | 2 | 0 | 0 |

### foldable

| Suite | Status | Tests | Failures | Errors | Passes | Ignored | Report |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CommonPassToPassTest | passed | 10 | 0 | 0 | 10 | 0 | 0 |
| SmPassToPassTest | passed | 2 | 0 | 0 | 2 | 0 | 0 |
| MdFailToPassTest | failed | 5 | 3 | 0 | 2 | 0 | 1 |

### tablet

| Suite | Status | Tests | Failures | Errors | Passes | Ignored | Report |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CommonPassToPassTest | passed | 10 | 0 | 0 | 10 | 0 | 0 |
| MdFailToPassTest | passed | 5 | 0 | 0 | 5 | 0 | 0 |
| LgFailToPassTest | failed | 9 | 7 | 0 | 2 | 0 | 1 |
```

说明：

- 上述数字是格式示例，实际数值以 `aa test` 输出解析为准。
- `Suites` 为当前设备实际执行的 suite 数量，不是配置中声明但被 CLI 覆盖后未执行的 suite 数量。
- 如果某个 suite 执行命令失败、超时或输出无法解析，应生成一条 `suiteResults` 记录，`status` 计入 failed 或 blocked，并在 summary 中展示该 suite。
- suite 明细顺序应与设备 `testFolders` 解析出的执行顺序一致。

## 预期验证结果

在当前已剥离多设备适配能力的应用代码上，目标结果为：

| 设备 | 选择文件夹 | 预期 |
| --- | --- | --- |
| phone | `common`, `sm` | passtopass 通过；sm 基线通过 |
| foldable | `common`, `sm`, `md` | common/sm 通过；运行时命中的 md failtopass 失败 |
| tablet | `common`, `md`, `lg` | common 通过；运行时命中的 md 或 lg failtopass 失败 |

说明：

- `sm` 文件夹在 foldable 上被选择时，sm 专属用例应因运行时断点不是 `sm` 而跳过并通过。
- `md` 文件夹在 tablet 上被选择时，md 专属用例应因运行时断点不是 `md` 而跳过并通过；tablet 的失败主要来自 `lg/failtopass`。
- 如果实际 tablet 运行时断点落入 `md`，则 `md/failtopass` 应失败，`lg/failtopass` 应跳过。

## 实施验收

代码重组完成后需要完成以下验证：

- `List.test.ets` 导入并注册所有新 suite，无旧路径引用。
- `hvigorw --mode module -p module=entry@default default@OhosTestCompileArkTS --no-daemon --stacktrace` 通过。
- `hvigorw --mode module -p module=entry@ohosTest ohosTest@PackageHap --no-daemon --stacktrace` 通过。
- `harmonyos-ohostest-runner` 单元测试通过，覆盖：
  - 顶层 `testFolders` 解析。
  - 设备 `testFolders` 解析。
  - 未知文件夹报错。
  - 空 suite class 报错。
  - 多 class 执行命令生成。
  - 多 class 结果聚合。
  - summary 同时输出设备聚合结果和 suite 明细结果。
- 使用 runner 在可用设备上执行矩阵：
  - 直板机：运行 `common + sm`。
  - 折叠屏：运行 `common + sm + md`。
  - 平板：运行 `common + md + lg`。

## 注意事项

- 不要把 md 预期迁移到 sm，或把 md 简化为 sm 同类断点。
- 不要为了让折叠屏和平板失败数量一致而修改断言语义。
- failtopass 的失败数量可以因设备实际运行断点不同而不同；关键是运行时命中的目标断点适配断言在剥离代码后失败。
- 若需要新增断言名称，应保持语义包含断点，例如 `on_medium_breakpoint` 或 `on_large_breakpoint`，避免后续误读。

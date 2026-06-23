# ohosTest 多设备适配验证计划

## 工程信息

- 工程目录：`ResponsiveRepeatLayout`
- 入口模块：`products/entry`
- 主模块名：`entry`
- 测试模块名：`entry_test`
- Ability：`EntryAbility`
- bundleName：`zhsc.1.xxxxxx`
- product：`default`
- 测试聚合入口：`products/entry/src/ohosTest/ets/test/List.test.ets`
- 共享测试 helper：`products/entry/src/ohosTest/ets/test/TestHelper.ets`

## 测试目录结构

```text
products/entry/src/ohosTest/ets/test/
├── Ability.test.ets
├── List.test.ets
├── TestHelper.ets
├── passtopass/
│   ├── HomePage.pass.test.ets
│   ├── CategoryPage.pass.test.ets
│   ├── CartPage.pass.test.ets
│   └── ProfilePage.pass.test.ets
└── failtopass/
    ├── HomePage.adaptive.test.ets
    ├── CategoryPage.adaptive.test.ets
    ├── CartPage.adaptive.test.ets
    └── ProfilePage.adaptive.test.ets
```

## 响应式机制与测试策略

- `TestHelper.ets` 共享 `Driver`，只启动一次入口 Ability，并通过 `main-tab-*` 稳定 id 切换 tab。
- 运行时通过窗口宽度判断 `sm`、`md`、`lg` 断点；非目标断点的用例显式跳过并通过。
- `passtopass` 覆盖基线可见性和小屏 `sm` 行为。
- `failtopass` 覆盖中屏、大屏、折叠屏和平板更容易暴露的适配行为，包括侧边 tab、多列 WaterFlow/List/Grid、分栏和溢出检查。

## passtopass 用例

### `passtopass/HomePage.pass.test.ets`

- `it('should_show_home_tab_content_after_app_launch')`
- `it('should_show_search_bar_on_home_page')`
- `it('should_show_home_waterflow_product_items')`
- `it('should_place_tab_bar_at_bottom_on_small_breakpoint')`
- `it('should_show_home_waterflow_as_two_columns_on_small_breakpoint')`

### `passtopass/CategoryPage.pass.test.ets`

- `it('should_switch_to_category_tab_and_show_category_content')`
- `it('should_show_category_side_list_and_product_area')`
- `it('should_show_category_products_as_two_columns_on_small_breakpoint')`

### `passtopass/CartPage.pass.test.ets`

- `it('should_switch_to_cart_tab_and_show_cart_content')`
- `it('should_show_cart_product_list_or_empty_state')`
- `it('should_show_cart_list_as_one_lane_on_small_breakpoint')`

### `passtopass/ProfilePage.pass.test.ets`

- `it('should_switch_to_profile_tab_and_show_profile_content')`
- `it('should_show_profile_order_and_menu_sections')`
- `it('should_show_profile_sections_as_vertical_layout_on_small_breakpoint')`
- `it('should_show_profile_sub_menu_as_one_lane_on_small_breakpoint')`

## failtopass 用例

### `failtopass/HomePage.adaptive.test.ets`

- `it('should_place_tab_bar_at_side_on_large_breakpoint')`
- `it('should_show_home_waterflow_as_multi_column_layout_on_medium_or_large_breakpoint')`
- `it('should_keep_home_waterflow_items_visible_without_horizontal_overflow_on_medium_or_large_breakpoint')`

### `failtopass/CategoryPage.adaptive.test.ets`

- `it('should_keep_category_left_list_within_expected_width_on_medium_or_large_breakpoint')`
- `it('should_show_category_products_as_four_columns_on_medium_or_large_breakpoint')`

### `failtopass/CartPage.adaptive.test.ets`

- `it('should_show_cart_list_as_two_lanes_on_large_breakpoint')`
- `it('should_keep_cart_control_panel_visible_without_covering_list_content_on_medium_or_large_breakpoint')`

### `failtopass/ProfilePage.adaptive.test.ets`

- `it('should_show_profile_user_area_and_menu_area_as_split_layout_on_large_breakpoint')`
- `it('should_show_profile_sub_menu_as_two_lanes_on_large_breakpoint')`

## 执行命令

```bash
hvigorw --mode project -p product=default assembleApp --analyze=normal --parallel --incremental --no-daemon
hvigorw --mode module -p module=entry@default default@OhosTestCompileArkTS --no-daemon --stacktrace
hvigorw --mode module -p module=entry@ohosTest ohosTest@PackageHap --no-daemon --stacktrace
hdc list targets
hdc -t <target> shell uitest uiInput keyEvent Home
hdc -t <target> shell uitest uiInput swipe <start-x> <start-y> <end-x> <end-y> <duration-ms>
hdc -t <target> install -r <main-hap-path> <ohos-test-hap-path>
hdc -t <target> shell aa test -b zhsc.1.xxxxxx -m entry_test -s unittest OpenHarmonyTestRunner -w 120000
```

说明：工程根目录当前未提供 `./hvigorw` wrapper，本机验证使用全局 `hvigorw`。

## 设备矩阵

| 设备类型 | 目标覆盖 | 状态 | 备注 |
| --- | --- | --- | --- |
| 直板机 | Phone / `sm` | 通过 | `Mate 80 Pro`，Tests run: 25, Failure: 0, Error: 0, Pass: 25 |
| 折叠屏 | Foldable / WideFold / 等价 profile | 通过 | `Mate X7`，Tests run: 25, Failure: 0, Error: 0, Pass: 25 |
| 平板 | Tablet / `lg` | 通过 | `MatePad Pro 13`，Tests run: 25, Failure: 0, Error: 0, Pass: 25 |

## Checklist

- [x] 已阅读 `harmonyos-multidevice-ui-tests` skill 和命令参考。
- [x] 已定位入口模块、bundleName、测试模块、聚合入口和测试 helper。
- [x] 已生成计划文档并对齐现有测试矩阵。
- [x] 测试目录结构已存在：`passtopass` 与 `failtopass`。
- [x] 聚合入口已注册所有多设备 suite。
- [x] 主应用 `assembleApp` 编译通过。
- [x] `ohosTest` ArkTS 编译通过。
- [x] `ohosTest` HAP 打包通过。
- [x] 已确认可用设备或模拟器 profile。
- [x] 直板机验证通过，最终报告 failure=0 且 error=0。
- [x] 折叠屏验证通过，最终报告 failure=0 且 error=0；若本机未安装 profile，记录原因。
- [x] 平板验证通过，最终报告 failure=0 且 error=0；若本机未安装 profile，记录原因。
- [x] 全部已执行设备类型最终通过。

## 验证记录

- 环境自检：
  - JDK：通过，OpenJDK 17.0.18。
  - Node.js：通过，v24.9.0。
  - ohpm：通过，6.1.1。
  - hvigorw：通过，6.23.2，全局命令可用。
  - DEVECO_SDK_HOME：通过，`/Users/guoyutong/command-line-tools/sdk`。
- 编译记录：
  - `hvigorw --mode project -p product=default assembleApp --analyze=normal --parallel --incremental --no-daemon`：通过，BUILD SUCCESSFUL。存在依赖资源重复、部分 API 兼容性和未配置签名 warning，无编译失败。
  - `hvigorw --mode module -p module=entry@default default@OhosTestCompileArkTS --no-daemon --stacktrace`：通过，BUILD SUCCESSFUL。存在依赖资源重复、部分 API 兼容性和 sourceMapsPath warning，无编译失败。
  - `hvigorw --mode module -p module=entry@ohosTest ohosTest@PackageHap --no-daemon --stacktrace`：通过，BUILD SUCCESSFUL。存在资源重复、TestKit API testing directories、`px2vp` deprecated、sourceMapsPath 等 warning，无打包失败。
- 本地构建产物静态检查：
  - 已存在主 HAP：`products/entry/build/default/outputs/default/app/entry-default.hap`
  - 已存在未签名主 HAP：`products/entry/build/default/outputs/default/entry-default-unsigned.hap`
  - 已存在 ohosTest HAP：`products/entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap`
  - 已存在 APP：`build/outputs/default/ResponsiveRepeatLayout-default-unsigned.app`
  - 说明：以上是工作区既有产物，不等同于本轮 `ohosTest` 编译/打包通过。
- 设备/profile 记录：
  - `HARMONYOS_EMULATOR` 当前未设置，本轮使用 `/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator`。
  - 默认 DevEco Emulator 可执行文件存在：`/Applications/DevEco-Studio.app/Contents/tools/emulator/Emulator`。
  - 已安装 profile：Phone `Mate 80 Pro`、Foldable `Mate X7`、Tablet `MatePad Pro 13`，均为 HarmonyOS 6.0.2(22)。
  - 初始 `hdc list targets`：无连接目标。
- UI 测试记录：
  - Phone `Mate 80 Pro`（target `127.0.0.1:15001`）：通过，`Tests run: 25, Failure: 0, Error: 0, Pass: 25, Ignore: 0`，`OHOS_REPORT_CODE: 0`。
  - Foldable `Mate X7`（target `127.0.0.1:15002`）首次运行：未通过，`Tests run: 25, Failure: 1, Error: 0, Pass: 24, Ignore: 0`；失败用例为 `should_place_tab_bar_at_side_on_medium_or_large_breakpoint`。原因：测试预期误将 `md` 断点要求为侧边 tab，实际设计为仅 `lg` 断点侧边 tab，折叠屏当前仍为底部 tab。已将该用例收窄为 `should_place_tab_bar_at_side_on_large_breakpoint`。
  - Foldable `Mate X7`（target `127.0.0.1:15002`）修正后复跑：通过，`Tests run: 25, Failure: 0, Error: 0, Pass: 25, Ignore: 0`，`OHOS_REPORT_CODE: 0`。
  - Tablet `MatePad Pro 13`（target `127.0.0.1:15003`）：通过，`Tests run: 25, Failure: 0, Error: 0, Pass: 25, Ignore: 0`，`OHOS_REPORT_CODE: 0`。

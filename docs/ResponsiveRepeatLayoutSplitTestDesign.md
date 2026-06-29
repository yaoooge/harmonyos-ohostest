# 重复布局 ohosTest 用例设计文档

## 1. 文档目的

本文档说明 WaterFlow、List、Grid 三类重复布局工程的测试分组、覆盖范围、每个用例的测试点和主要断言方式，便于维护相关 HarmonyOS UI 测试。

三个工程分别为：

- `ResponsiveWaterFlowLayout`：考察商品瀑布流在多端窗口下的列数适配。
- `ResponsiveListLayout`：考察订单列表在多端窗口下的 lanes 适配。
- `ResponsiveGridLayout`：考察分类宫格在多端窗口下的列数适配。

测试重点是用户可见 UI 行为，不覆盖私有工具函数或纯业务逻辑实现。

## 2. 测试范围

每个工程包含一个主页面：

| 工程 | 页面内容 | 核心容器 id | 首个 item id |
| --- | --- | --- | --- |
| `ResponsiveWaterFlowLayout` | 瀑布流推荐、商品卡片、价格和标签 | `product-waterflow` | `product-waterflow-item0` |
| `ResponsiveListLayout` | 订单列表、商品信息、状态和金额 | `order-list` | `order-list-item0` |
| `ResponsiveGridLayout` | 分类宫格、分类标题和说明 | `category-grid` | `category-grid-item0` |



## 3. 测试分组

三个工程使用相同的 suite 结构：

| 分组文件 | 分组名称 | 用例数量 | 分组定位 |
| --- | --- | ---: | --- |
| `CommonPassToPass.test.ets` | `CommonPassToPassTest` | 4 | 所有设备都应通过的基础冒烟、页面内容可见性、重复项可见性和基础溢出检查。 |
| `SmPassToPass.test.ets` | `SmPassToPassTest` | 1 | 小屏 `sm` 断点基线行为。 |
| `MdFailToPass.test.ets` | `MdFailToPassTest` | 1 | 中屏 `md` 断点自适应增强能力。 |
| `LgFailToPass.test.ets` | `LgFailToPassTest` | 1 | 大屏 `lg` 断点自适应增强能力。 |



## 4. Runner 选择

默认 `harmonyos-ohostest-runner/config/machine.json` 按设备选择 suite：

| 设备 | Suite |
| --- | --- |
| phone | `CommonPassToPassTest`、`SmPassToPassTest` |
| foldable | `CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest` |
| tablet | `CommonPassToPassTest`、`LgFailToPassTest` |

该选择避免在非目标断点上运行 failtopass 后因断点跳过而误判通过。对于 `answer` 工程，上述 suite 应全部通过；对于 `swe` 工程，pass-to-pass suite 应通过，运行到的 fail-to-pass suite 应失败。

## 5. 断点与公共测试方法

公共能力由每个工程的 `TestHelper.ets` 提供：

- `prepareEntryAbility()`：启动并复用 `EntryAbility`，等待当前页面根节点出现。
- `getCurrentBreakpoint()`：根据当前窗口宽度换算 vp，并按 `<600vp`、`600-839vp`、`>=840vp` 判断为 `sm`、`md`、`lg`。
- `assertComponentById()` / `assertComponentByText()`：验证关键组件或文本存在。
- `estimateLanesById()`：根据容器宽度与首个子项宽度估算当前可见列数或 lanes 数。
- `assertNoHorizontalOverflow()`：检查首个重复项左右边界不超出容器边界。



## 6. 用例明细

### 6.1 ResponsiveWaterFlowLayout

| 分组 | 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- | --- |
| Common | `should_start_ability_successfully` | 应用入口可正常启动。 | 启动 `EntryAbility` 后检查 `waterflow-page` 存在。 |
| Common | `should_show_waterflow_page_content` | 页面标题和核心文案可见。 | 断言 `waterflow-header` 和 `瀑布流推荐` 文本存在。 |
| Common | `should_show_waterflow_items` | 商品瀑布流和商品项渲染正常。 | 断言 `product-waterflow` 和 `product-waterflow-item0` 存在。 |
| Common | `should_keep_waterflow_items_without_horizontal_overflow` | 商品卡片不发生横向溢出。 | 检查 `product-waterflow-item0` 左右边界位于 `product-waterflow` 内。 |
| Sm | `should_show_waterflow_as_two_columns_on_small_breakpoint` | 小屏瀑布流为 2 列。 | 当前断点为 `sm` 时估算列数，断言等于 2。 |
| Md | `should_show_waterflow_as_three_columns_on_medium_breakpoint` | 中屏瀑布流为 3 列。 | 当前断点为 `md` 时估算列数，断言等于 3。 |
| Lg | `should_show_waterflow_as_four_columns_on_large_breakpoint` | 大屏瀑布流为 4 列。 | 当前断点为 `lg` 时估算列数，断言等于 4。 |

### 6.2 ResponsiveListLayout

| 分组 | 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- | --- |
| Common | `should_start_ability_successfully` | 应用入口可正常启动。 | 启动 `EntryAbility` 后检查 `list-page` 存在。 |
| Common | `should_show_list_page_content` | 页面标题和核心文案可见。 | 断言 `list-header` 和 `订单列表` 文本存在。 |
| Common | `should_show_list_items` | 订单列表和订单项渲染正常。 | 断言 `order-list` 和 `order-list-item0` 存在。 |
| Common | `should_keep_list_items_without_horizontal_overflow` | 订单项不发生横向溢出。 | 检查 `order-list-item0` 左右边界位于 `order-list` 内。 |
| Sm | `should_show_list_as_one_lane_on_small_breakpoint` | 小屏订单列表为 1 lane。 | 当前断点为 `sm` 时估算 lanes，断言等于 1。 |
| Md | `should_show_list_as_two_lanes_on_medium_breakpoint` | 中屏订单列表为 2 lanes。 | 当前断点为 `md` 时估算 lanes，断言等于 2。 |
| Lg | `should_show_list_as_three_lanes_on_large_breakpoint` | 大屏订单列表为 3 lanes。 | 当前断点为 `lg` 时估算 lanes，断言等于 3。 |

### 6.3 ResponsiveGridLayout

| 分组 | 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- | --- |
| Common | `should_start_ability_successfully` | 应用入口可正常启动。 | 启动 `EntryAbility` 后检查 `grid-page` 存在。 |
| Common | `should_show_grid_page_content` | 页面标题和核心文案可见。 | 断言 `grid-header` 和 `分类宫格` 文本存在。 |
| Common | `should_show_grid_items` | 分类宫格和分类项渲染正常。 | 断言 `category-grid` 和 `category-grid-item0` 存在。 |
| Common | `should_keep_grid_items_without_horizontal_overflow` | 分类项不发生横向溢出。 | 检查 `category-grid-item0` 左右边界位于 `category-grid` 内。 |
| Sm | `should_show_grid_as_two_columns_on_small_breakpoint` | 小屏分类宫格为 2 列。 | 当前断点为 `sm` 时估算列数，断言等于 2。 |
| Md | `should_show_grid_as_three_columns_on_medium_breakpoint` | 中屏分类宫格为 3 列。 | 当前断点为 `md` 时估算列数，断言等于 3。 |
| Lg | `should_show_grid_as_four_columns_on_large_breakpoint` | 大屏分类宫格为 4 列。 | 当前断点为 `lg` 时估算列数，断言等于 4。 |

## 7. 覆盖矩阵

| 工程 / 能力 | 通用可见性 | sm 小屏 | md 中屏 | lg 大屏 |
| --- | --- | --- | --- | --- |
| `ResponsiveWaterFlowLayout` | 页面、瀑布流、首个商品项、无横向溢出 | 2 列 | 3 列 | 4 列 |
| `ResponsiveListLayout` | 页面、列表、首个订单项、无横向溢出 | 1 lane | 2 lanes | 3 lanes |
| `ResponsiveGridLayout` | 页面、宫格、首个分类项、无横向溢出 | 2 列 | 3 列 | 4 列 |

## 8. 当前验证期望

| 工程类型 | 结果期望 |
| --- | --- |
| `answer` | phone、foldable、tablet 上对应 suite 全部通过，failure=0、error=0。 |
| `swe` | phone 的 pass-to-pass suite 通过；foldable 的 `MdFailToPassTest` 失败；tablet 的 `LgFailToPassTest` 失败。 |

## 9. 设计说明

1. 三个工程均为单页面结构，测试直接围绕页面核心重复布局展开。
2. `PassToPass` 分组用于验证当前基线能力，保证应用在启动、小屏和基础可见性场景下不回退。
3. `FailToPass` 分组用于验证中大屏布局目标，适合作为对应设备上的验收用例。
4. 列数和 lanes 断言基于 UI 实际 bounds 估算，关注最终渲染结果，而不是耦合内部布局参数。
5. 重复项测试 id 使用 index 后缀保证唯一性，测试默认选取首个 item 作为代表项进行可见性、溢出和列数估算。

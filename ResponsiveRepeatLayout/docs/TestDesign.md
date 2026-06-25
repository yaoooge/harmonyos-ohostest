# ResponsiveRepeatLayout ohosTest 用例设计文档

## 1. 文档目的

本文档基于当前 `src/ohosTest/ets/test` 目录下已有自动化测试用例整理，说明测试分组、覆盖范围、每个用例的测试点和主要断言方式，便于后续维护响应式重复布局相关的 HarmonyOS UI 测试。

## 2. 测试范围

当前测试围绕电商类主页面的四个一级 Tab 展开：

- 首页：商品 WaterFlow、商品卡片可见性、横向溢出、自适应列数。
- 分类：左侧分类列表、商品网格区域、自适应列数。
- 购物车：购物车页面、列表或空状态、不同断点下列表列数。
- 我的：当前只保留空页签，页面内容提示 `暂无数据`；不再覆盖个人中心订单、菜单、用户区或分栏布局。

测试重点是用户可见 UI 行为，不覆盖私有工具函数或纯业务逻辑实现。

## 3. 测试分组

| 分组文件 | 分组名称 | 用例数量 | 分组定位 |
| --- | --- | ---: | --- |
| `CommonPassToPass.test.ets` | `CommonPassToPassTest` | 8 | 所有设备都应通过的基础冒烟、Tab 切换、关键内容可见性和基础溢出检查。 |
| `SmPassToPass.test.ets` | `SmPassToPassTest` | 3 | 小屏 `sm` 断点基线行为，验证首页/分类双列和购物车单列。 |
| `MdFailToPass.test.ets` | `MdFailToPassTest` | 2 | 中屏 `md` 断点自适应增强能力，验证首页多列和分类四列布局。 |
| `LgFailToPass.test.ets` | `LgFailToPassTest` | 3 | 大屏 `lg` 断点自适应增强能力，验证首页多列、分类四列和购物车双列。 |

`List.test.ets` 是测试聚合入口，按顺序注册 `CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest`、`LgFailToPassTest`。`MdPassToPass.test.ets` 已删除。

## 4. Runner 选择

默认 `harmonyos-ohostest-runner/config/machine.json` 按设备选择 suite：

| 设备 | Suite |
| --- | --- |
| phone | `CommonPassToPassTest`、`SmPassToPassTest` |
| foldable | `CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest` |
| tablet | `CommonPassToPassTest`、`LgFailToPassTest` |

该选择避免在非目标断点上运行 failtopass 后因断点跳过而误判通过。对于 `answer` 工程，上述 suite 应全部通过；对于 `swe` 工程，pass-to-pass suite 应通过，运行到的 fail-to-pass suite 应全部失败。

## 5. 断点与公共测试方法

公共能力由 `TestHelper.ets` 提供：

- `prepareEntryAbility()`：启动并复用 `EntryAbility`，等待 `main-tabs` 出现。
- `getCurrentBreakpoint()`：根据当前窗口宽度换算 vp，并按 `<600vp`、`600-839vp`、`>=840vp` 判断为 `sm`、`md`、`lg`。
- `clickTabByIndex()`：通过 `main-tab-0` 至 `main-tab-3` 切换首页、分类、购物车、我的。
- `assertComponentById()` / `assertComponentByText()`：验证关键组件或文本存在。
- `estimateLanesById()`：根据容器宽度与首个子项宽度估算当前可见列数。
- `assertNoHorizontalOverflow()`：检查列表项左右边界不超出容器边界。

断点专项用例会先判断当前设备断点。若当前断点不是目标断点，则用例显式通过，避免在不匹配设备上产生误报。因此 runner 默认配置只在对应设备上选择对应 failtopass suite。

## 6. 用例明细

### 6.1 CommonPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_start_ability_successfully` | 应用入口可正常启动。 | 启动 `EntryAbility` 后检查 `main-tabs` 存在。 |
| `should_show_home_tab_content_after_app_launch` | 首页启动后可见四个一级 Tab 文案。 | 切换到首页，断言 `首页`、`分类`、`购物车`、`我的` 文本存在。 |
| `should_show_home_waterflow_product_items` | 首页商品瀑布流和商品项渲染正常。 | 切换首页，断言 `home-waterflow` 和 `home-waterflow-item` 存在。 |
| `should_keep_home_waterflow_items_visible_without_horizontal_overflow` | 首页瀑布流商品项不发生横向溢出。 | 等待 `home-waterflow`，检查所有 `home-waterflow-item` 左右边界位于容器内。 |
| `should_switch_to_category_tab_and_show_category_content` | 分类 Tab 可切换且核心内容可见。 | 切换分类，等待 `category-left-list`，断言 `分类` 文本和左侧分类列表存在。 |
| `should_show_category_side_list_and_product_area` | 分类页左右区域同时渲染。 | 切换分类，等待 `category-product-grid`，断言 `category-left-list` 和 `category-product-grid` 存在。 |
| `should_switch_to_cart_tab_and_show_cart_content` | 购物车 Tab 可切换且页面容器可见。 | 切换购物车，等待 `cart-page`，断言 `购物车` 文本和 `cart-page` 存在。 |
| `should_show_cart_product_list_or_empty_state` | 购物车应展示商品列表或空状态之一。 | 切换购物车，断言 `cart-list` 或 `cart-empty-state` 至少一个存在。 |

### 6.2 SmPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_show_home_waterflow_as_two_columns_on_small_breakpoint` | 小屏首页瀑布流为双列。 | 切换首页，当前断点为 `sm` 时估算 `home-waterflow-item` 列数，断言等于 2。 |
| `should_show_category_products_as_two_columns_on_small_breakpoint` | 小屏分类商品区为双列。 | 切换分类，当前断点为 `sm` 时估算 `category-product-item` 列数，断言等于 2。 |
| `should_show_cart_list_as_one_lane_on_small_breakpoint` | 小屏购物车列表为单列。 | 切换购物车，当前断点为 `sm` 且存在 `cart-list` 时，估算 `cart-list-item` 列数，断言等于 1。 |

### 6.3 MdFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_show_home_waterflow_as_multi_column_layout_on_medium_breakpoint` | 中屏首页瀑布流应从小屏双列扩展为多列。 | 切换首页，当前断点为 `md` 时估算 `home-waterflow-item` 列数，断言大于 2。 |
| `should_show_category_products_as_four_columns_on_medium_breakpoint` | 中屏分类商品区应展示四列。 | 切换分类，当前断点为 `md` 时估算 `category-product-item` 列数，断言等于 4。 |

### 6.4 LgFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_show_home_waterflow_as_multi_column_layout_on_large_breakpoint` | 大屏首页瀑布流应展示多列商品。 | 切换首页，当前断点为 `lg` 时估算 `home-waterflow-item` 列数，断言大于 2。 |
| `should_show_category_products_as_four_columns_on_large_breakpoint` | 大屏分类商品区应展示四列。 | 切换分类，当前断点为 `lg` 时估算 `category-product-item` 列数，断言等于 4。 |
| `should_show_cart_list_as_two_lanes_on_large_breakpoint` | 大屏购物车列表应展示双列。 | 切换购物车，当前断点为 `lg` 且存在 `cart-list` 时，估算 `cart-list-item` 列数，断言等于 2。 |

## 7. 覆盖矩阵

| 页面 / 能力 | 通用可见性 | sm 小屏 | md 中屏 | lg 大屏 |
| --- | --- | --- | --- | --- |
| 主 Tab | 启动和四个 Tab 文案可见 | - | - | - |
| 首页 | 瀑布流、商品项、无横向溢出 | 瀑布流 2 列 | 瀑布流 >2 列 | 瀑布流 >2 列 |
| 分类 | 左侧列表、商品区域可见 | 商品 2 列 | 商品 4 列 | 商品 4 列 |
| 购物车 | 页面可见、列表或空状态 | 列表 1 列 | - | 列表 2 列 |
| 我的 | Tab 文案可见；页面为空状态 | - | - | - |

## 8. 当前验证结果

本轮验证使用 `harmonyos-ohostest-runner` 执行，suite 选择与默认 `machine.json` 一致。

| 工程 | 结果摘要 |
| --- | --- |
| `answer` | phone、foldable、tablet 全部通过；`CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest`、`LgFailToPassTest` 在对应设备上均为 failure=0、error=0。 |
| `swe` | phone 的 pass-to-pass 全部通过；foldable 的 `MdFailToPassTest` 2 个用例全部失败；tablet 的 `LgFailToPassTest` 3 个用例全部失败。 |

## 9. 设计说明

1. `PassToPass` 分组用于验证当前基线能力，保证应用在既有设备和小屏场景下不回退。
2. `FailToPass` 分组用于验证中大屏适配目标，缺少响应式适配时更容易失败，适合作为多设备改造后的验收用例。
3. 各断点专项用例都包含断点判断，非目标设备上不执行强断言；runner 默认设备选择负责避免 failtopass 被非目标断点跳过。
4. 列数断言基于 UI 实际 bounds 估算，关注最终渲染结果，而不是耦合内部布局参数。
5. 购物车相关用例兼容列表和空状态；只有在实际存在列表时才检查列表列数，避免测试数据差异导致误报。
6. 个人中心内容已从产品代码和测试中移除；后续如恢复个人中心，应重新设计对应通用可见性和断点用例。

## 10. 后续维护建议

- 如新增一级 Tab 或主要页面区域，应同步增加通用可见性用例和对应断点专项用例。
- 如调整断点阈值，应同步检查 `TestHelper.ets` 中 `BREAKPOINT_SM`、`BREAKPOINT_MD` 是否与业务代码保持一致。
- 如改变商品卡片、分类商品项或购物车项的宽度策略，应优先更新列数预期，再运行 sm、md、lg 三类设备验证。
- 如重构组件层级，应保留面向测试的稳定 `id`，避免 UI 自动化测试依赖易变的内部结构。

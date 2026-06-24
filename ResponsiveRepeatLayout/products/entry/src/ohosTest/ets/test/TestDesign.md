# ResponsiveRepeatLayout ohosTest 用例设计文档

## 1. 文档目的

本文档基于当前 `src/ohosTest/ets/test` 目录下已有自动化测试用例整理，说明测试分组、覆盖范围、每个用例的测试点和主要断言方式，便于后续维护响应式重复布局相关的 HarmonyOS UI 测试。

## 2. 测试范围

当前测试围绕电商类主页面的四个一级 Tab 展开：

- 首页：搜索栏、商品 WaterFlow、商品卡片可见性、横向溢出、自适应列数。
- 分类：左侧分类列表、商品网格区域、自适应列数、左侧列表宽度约束。
- 购物车：购物车页面、列表或空状态、控制面板、不同断点下列表列数。
- 我的：个人中心页面、订单和菜单区域、小屏纵向布局、大屏分栏布局、菜单列数。

测试重点是用户可见 UI 行为，不覆盖私有工具函数或纯业务逻辑实现。

## 3. 测试分组

| 分组文件 | 分组名称 | 用例数量 | 分组定位 |
| --- | --- | ---: | --- |
| `CommonPassToPass.test.ets` | `CommonPassToPassTest` | 12 | 所有设备都应通过的基础冒烟、Tab 切换、关键内容可见性和基础溢出检查。 |
| `SmPassToPass.test.ets` | `SmPassToPassTest` | 6 | 小屏 `sm` 断点基线行为，验证底部 Tab、首页/分类双列、购物车/我的单列等已支持能力。 |
| `MdPassToPass.test.ets` | `MdPassToPassTest` | 3 | 中屏 `md` 断点基线行为，验证与小屏一致的底部 Tab、个人中心纵向布局和子菜单单列。 |
| `MdFailToPass.test.ets` | `MdFailToPassTest` | 2 | 中屏 `md` 断点自适应增强能力，验证首页多列和分类四列布局。 |
| `LgFailToPass.test.ets` | `LgFailToPassTest` | 7 | 大屏 `lg` 断点自适应增强能力，验证侧边 Tab、多列列表、分类宽度约束、购物车双列和个人中心分栏。 |

`List.test.ets` 是测试聚合入口，按顺序注册以上四个分组。

## 4. 断点与公共测试方法

公共能力由 `TestHelper.ets` 提供：

- `prepareEntryAbility()`：启动并复用 `EntryAbility`，等待 `main-tabs` 出现。
- `getCurrentBreakpoint()`：根据当前窗口宽度换算 vp，并按 `<600vp`、`600-839vp`、`>=840vp` 判断为 `sm`、`md`、`lg`。
- `clickTabByIndex()`：通过 `main-tab-0` 至 `main-tab-3` 切换首页、分类、购物车、我的。
- `assertComponentById()` / `assertComponentByText()`：验证关键组件或文本存在。
- `assertMainTabsHorizontal()`：通过前两个 Tab 的 bounds 判断 Tab 横向排列。
- `assertMainTabsVertical()`：通过前两个 Tab 的 bounds 判断 Tab 纵向排列。
- `estimateLanesById()`：根据容器宽度与首个子项宽度估算当前可见列数。
- `assertNoHorizontalOverflow()`：检查列表项左右边界不超出容器边界。

断点专项用例会先判断当前设备断点。若当前断点不是目标断点，则用例显式通过，避免在不匹配设备上产生误报。

## 5. 用例明细

### 5.1 CommonPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_start_ability_successfully` | 应用入口可正常启动。 | 启动 `EntryAbility` 后检查 `main-tabs` 存在。 |
| `should_show_home_tab_content_after_app_launch` | 首页启动后可见四个一级 Tab 文案。 | 切换到首页，断言 `首页`、`分类`、`购物车`、`我的` 文本存在。 |
| `should_show_search_bar_on_home_page` | 首页搜索栏渲染正常。 | 切换首页，断言 `search` 组件存在。 |
| `should_show_home_waterflow_product_items` | 首页商品瀑布流和商品项渲染正常。 | 切换首页，断言 `home-waterflow` 和 `home-waterflow-item` 存在。 |
| `should_keep_home_waterflow_items_visible_without_horizontal_overflow` | 首页瀑布流商品项不发生横向溢出。 | 等待 `home-waterflow`，检查所有 `home-waterflow-item` 左右边界位于容器内。 |
| `should_switch_to_category_tab_and_show_category_content` | 分类 Tab 可切换且核心内容可见。 | 切换分类，等待 `category-left-list`，断言 `分类` 文本和左侧分类列表存在。 |
| `should_show_category_side_list_and_product_area` | 分类页左右区域同时渲染。 | 切换分类，等待 `category-product-grid`，断言 `category-left-list` 和 `category-product-grid` 存在。 |
| `should_switch_to_cart_tab_and_show_cart_content` | 购物车 Tab 可切换且页面容器可见。 | 切换购物车，等待 `cart-page`，断言 `购物车` 文本和 `cart-page` 存在。 |
| `should_show_cart_product_list_or_empty_state` | 购物车应展示商品列表或空状态之一。 | 切换购物车，断言 `cart-list` 或 `cart-empty-state` 至少一个存在。 |
| `should_show_cart_control_panel_when_cart_list_exists` | 有购物车列表时应展示控制面板。 | 若 `cart-list` 存在，则断言 `cart-control-panel` 存在；无列表时跳过该断言并通过。 |
| `should_switch_to_profile_tab_and_show_profile_content` | 我的 Tab 可切换且页面容器可见。 | 切换我的，等待 `profile-page`，断言 `我的` 文本和 `profile-page` 存在。 |
| `should_show_profile_order_and_menu_sections` | 我的页面订单与菜单入口可见。 | 切换我的，断言 `我的订单` 和 `地址管理` 文本存在。 |

### 5.2 SmPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_place_tab_bar_at_bottom_on_small_breakpoint` | 小屏断点下主 Tab 应为底部横向排列。 | 当前断点为 `sm` 时，比较 `main-tab-0` 和 `main-tab-1` 的 bounds，断言两者同一行且第二项位于第一项右侧。 |
| `should_show_home_waterflow_as_two_columns_on_small_breakpoint` | 小屏首页瀑布流为双列。 | 切换首页，当前断点为 `sm` 时估算 `home-waterflow-item` 列数，断言等于 2。 |
| `should_show_category_products_as_two_columns_on_small_breakpoint` | 小屏分类商品区为双列。 | 切换分类，当前断点为 `sm` 时估算 `category-product-item` 列数，断言等于 2。 |
| `should_show_cart_list_as_one_lane_on_small_breakpoint` | 小屏购物车列表为单列。 | 切换购物车，当前断点为 `sm` 且存在 `cart-list` 时，估算 `cart-list-item` 列数，断言等于 1。 |
| `should_show_profile_sections_as_vertical_layout_on_small_breakpoint` | 小屏个人中心菜单区域保持纵向单列布局。 | 切换我的，当前断点为 `sm` 时估算 `profile-sub-menu-item` 列数，断言等于 1。 |
| `should_show_profile_sub_menu_as_one_lane_on_small_breakpoint` | 小屏个人中心子菜单为单列。 | 切换我的，当前断点为 `sm` 时估算 `profile-sub-menu-item` 列数，断言等于 1。 |

说明：后两个用例当前断言对象相同，均验证 `profile-sub-menu-list` 在小屏下为单列，可视为分别覆盖“个人中心区域纵向布局”和“子菜单单列布局”两个测试意图。

### 5.3 MdPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_place_tab_bar_at_bottom_on_medium_breakpoint` | 中屏断点下主 Tab 与小屏一致，仍为底部横向排列。 | 当前断点为 `md` 时，比较 `main-tab-0` 和 `main-tab-1` 的 bounds，断言两者同一行且第二项位于第一项右侧。 |
| `should_show_profile_sections_as_vertical_layout_on_medium_breakpoint` | 中屏个人中心菜单区域与小屏一致，保持纵向单列布局。 | 切换我的，当前断点为 `md` 时估算 `profile-sub-menu-item` 列数，断言等于 1。 |
| `should_show_profile_sub_menu_as_one_lane_on_medium_breakpoint` | 中屏个人中心子菜单与小屏一致，保持单列。 | 切换我的，当前断点为 `md` 时估算 `profile-sub-menu-item` 列数，断言等于 1。 |

### 5.4 MdFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_show_home_waterflow_as_multi_column_layout_on_medium_breakpoint` | 中屏首页瀑布流应从小屏双列扩展为多列。 | 切换首页，当前断点为 `md` 时估算 `home-waterflow-item` 列数，断言大于 2。 |
| `should_show_category_products_as_four_columns_on_medium_breakpoint` | 中屏分类商品区应展示四列。 | 切换分类，当前断点为 `md` 时估算 `category-product-item` 列数，断言等于 4。 |

### 5.5 LgFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_place_tab_bar_at_side_on_large_breakpoint` | 大屏断点下主 Tab 应切换为侧边纵向排列。 | 当前断点为 `lg` 时，比较 `main-tab-0` 和 `main-tab-1` 的 bounds，断言两者同一列且第二项位于第一项下方。 |
| `should_show_home_waterflow_as_multi_column_layout_on_large_breakpoint` | 大屏首页瀑布流应展示多列商品。 | 切换首页，当前断点为 `lg` 时估算 `home-waterflow-item` 列数，断言大于 2。 |
| `should_keep_category_left_list_within_expected_width_on_large_breakpoint` | 大屏分类左侧列表宽度应受控，避免占用过多内容区。 | 切换分类，当前断点为 `lg` 时断言 `category-left-list` 存在，并检查其宽度不超过 240vp。 |
| `should_show_category_products_as_four_columns_on_large_breakpoint` | 大屏分类商品区应展示四列。 | 切换分类，当前断点为 `lg` 时估算 `category-product-item` 列数，断言等于 4。 |
| `should_show_cart_list_as_two_lanes_on_large_breakpoint` | 大屏购物车列表应展示双列。 | 切换购物车，当前断点为 `lg` 且存在 `cart-list` 时，估算 `cart-list-item` 列数，断言等于 2。 |
| `should_show_profile_user_area_and_menu_area_as_split_layout_on_large_breakpoint` | 大屏个人中心应采用用户区域与菜单区域分栏布局。 | 切换我的，当前断点为 `lg` 时断言 `profile-lg-split`、`profile-user-area`、`profile-menu-area` 存在。 |
| `should_show_profile_sub_menu_as_two_lanes_on_large_breakpoint` | 大屏个人中心子菜单应展示双列。 | 切换我的，当前断点为 `lg` 时估算 `profile-sub-menu-item` 列数，断言等于 2。 |

## 6. 覆盖矩阵

| 页面 / 能力 | 通用可见性 | sm 小屏 | md 中屏 | lg 大屏 |
| --- | --- | --- | --- | --- |
| 主 Tab | 启动和文案可见 | 底部横向 Tab | 底部横向 Tab | 侧边纵向 Tab |
| 首页 | 搜索栏、瀑布流、商品项、无横向溢出 | 瀑布流 2 列 | 瀑布流 >2 列 | 瀑布流 >2 列 |
| 分类 | 左侧列表、商品区域可见 | 商品 2 列 | 商品 4 列 | 左侧列表宽度 <=240vp、商品 4 列 |
| 购物车 | 页面可见、列表或空状态、控制面板 | 列表 1 列 | - | 列表 2 列 |
| 我的 | 页面可见、订单和菜单入口 | 子菜单 1 列 | 子菜单 1 列 | 用户区/菜单区分栏、子菜单 2 列 |

## 7. 设计说明

1. `PassToPass` 分组用于验证当前基线能力，保证应用在既有设备和小屏场景下不回退。
2. `FailToPass` 分组用于验证中大屏适配目标，缺少响应式适配时更容易失败，适合作为多设备改造后的验收用例。
3. 各断点专项用例都包含断点判断，非目标设备上不执行强断言，从而支持同一套测试在不同设备上运行。
4. 列数断言基于 UI 实际 bounds 估算，关注最终渲染结果，而不是耦合内部布局参数。
5. 购物车相关用例兼容列表和空状态；只有在实际存在列表时才检查列表列数和控制面板，避免测试数据差异导致误报。

## 8. 后续维护建议

- 如新增一级 Tab 或主要页面区域，应同步增加通用可见性用例和对应断点专项用例。
- 如调整断点阈值，应同步检查 `TestHelper.ets` 中 `BREAKPOINT_SM`、`BREAKPOINT_MD` 是否与业务代码保持一致。
- 如改变商品卡片、购物车项或个人中心菜单的宽度策略，应优先更新列数预期，再运行 sm、md、lg 三类设备验证。
- 如重构组件层级，应保留面向测试的稳定 `id`，避免 UI 自动化测试依赖易变的内部结构。

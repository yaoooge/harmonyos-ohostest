# Displacement And Indent Layout ohosTest Design Spec

## 设计约束

- 挪移布局、缩进布局分别是独立鸿蒙工程，不放入 `ResponsiveRepeatLayout`。
- 每个布局工程采用和当前题库一致的双工程形态：
  - `answer/`：包含正确多设备适配实现，所有测试最终应通过。
  - `swe/`：剥离或缺失目标适配能力，所有 `*PassToPass` suite 应通过，所有实际配置的 `*FailToPass` suite 在目标设备上应失败。
- 用例文件命名参考 `ResponsiveRepeatLayout`，按 common 和断点拆分为 `CommonPassToPass.test.ets`、`SmPassToPass.test.ets`、`MdPassToPass.test.ets`、`LgPassToPass.test.ets`、`MdFailToPass.test.ets`、`LgFailToPass.test.ets`。其中 `MdPassToPass` / `LgPassToPass` 用于中大屏不退化能力，`FailToPass` 只放 SWE 下确定失败的目标适配断言。
- 测试只验证用户可见 UI 布局表现，不测试私有断点工具函数。
- 每个工程独立维护 `products/entry/src/ohosTest/ets/test`，独立编译、安装和运行。

## 顶层目录

```text
DisplacementLayout/
├── answer/
│   ├── AppScope/
│   ├── build-profile.json5
│   ├── hvigorfile.ts
│   ├── oh-package.json5
│   └── products/entry/
└── swe/
    ├── AppScope/
    ├── build-profile.json5
    ├── hvigorfile.ts
    ├── oh-package.json5
    └── products/entry/

IndentLayout/
├── answer/
│   ├── AppScope/
│   ├── build-profile.json5
│   ├── hvigorfile.ts
│   ├── oh-package.json5
│   └── products/entry/
└── swe/
    ├── AppScope/
    ├── build-profile.json5
    ├── hvigorfile.ts
    ├── oh-package.json5
    └── products/entry/
```

## 已实现基线：ResponsiveRepeatLayout

`ResponsiveRepeatLayout` 已作为重复布局原子工程完成，可作为后续 `DisplacementLayout`、`IndentLayout` 的工程结构、测试命名和 runner 选择参考。

### 工程形态

```text
ResponsiveRepeatLayout/
├── answer/
│   ├── AppScope/
│   ├── build-profile.json5
│   ├── commons/
│   └── products/entry/
└── swe/
    ├── AppScope/
    ├── build-profile.json5
    ├── commons/
    └── products/entry/
```

- `answer/` 保留完整响应式重复布局实现，并已通过多设备 ohosTest 验证。
- `swe/` 保留小屏基线能力，剥离中大屏重复布局增强能力，用于 fail-to-pass 测试暴露缺陷。
- 入口模块为 `products/entry`，测试模块为 `entry_test`，Ability 为 `EntryAbility`。
- 测试目录采用单层文件命名：`CommonPassToPass.test.ets`、`SmPassToPass.test.ets`、`MdFailToPass.test.ets`、`LgFailToPass.test.ets`、`List.test.ets`、`TestHelper.ets`。

### 应用范围

当前 `ResponsiveRepeatLayout` 围绕电商类主页面四个一级 Tab 收敛为原子工程：

| 页面 | 保留内容 | 重复布局能力 |
| --- | --- | --- |
| 首页 | 商品 `WaterFlow`、商品卡片、基础分类入口 | `WaterFlow.columnsTemplate` 随断点从小屏双列扩展到中大屏多列。 |
| 分类 | 左侧分类列表、商品网格区域 | `GridRow` 在小屏双列、中大屏四列之间切换。 |
| 购物车 | 购物车页面、商品列表或空状态、推荐商品区 | `List.lanes` 在小屏单列、大屏双列之间切换。 |
| 我的 | 空页签和 `暂无数据` 提示 | 不再覆盖个人中心订单、菜单、用户区或分栏布局。 |

### 响应式实现点

- `views/Index.ets` 注册 `BreakpointSystem`，入口页面负责断点系统初始化。
- `views/MainEntry.ets` 使用主 `Tabs` 承载四个一级页面；大屏侧边 Tabs 逻辑在工程中存在，但本工程测试重点仍是重复布局。
- `components/ProductWaterFlow.ets` 和 `viewmodels/ProductWaterFlowVM.ets` 通过 `columnsTemplate` 实现首页商品流列数变化。
- `components/ProductCategory.ets` 通过 `GridRow` 实现分类商品区小屏双列、中大屏四列。
- `components/CartListView.ets` 通过 `List.lanes` 实现购物车小屏单列、大屏双列。
- 各可测容器和条目保留稳定 id，例如 `main-tabs`、`main-tab-*`、`home-waterflow`、`home-waterflow-item`、`category-product-grid`、`category-product-item`、`cart-list`、`cart-list-item`。

### 测试分组

| 分组文件 | 分组名称 | 用例数量 | 分组定位 |
| --- | --- | ---: | --- |
| `CommonPassToPass.test.ets` | `CommonPassToPassTest` | 8 | 所有设备都应通过的基础冒烟、Tab 切换、关键内容可见性和基础溢出检查。 |
| `SmPassToPass.test.ets` | `SmPassToPassTest` | 3 | 小屏 `sm` 断点基线行为，验证首页/分类双列和购物车单列。 |
| `MdFailToPass.test.ets` | `MdFailToPassTest` | 2 | 中屏 `md` 断点重复布局增强能力，验证首页多列和分类四列。 |
| `LgFailToPass.test.ets` | `LgFailToPassTest` | 3 | 大屏 `lg` 断点重复布局增强能力，验证首页多列、分类四列和购物车双列。 |

`List.test.ets` 按顺序注册 `CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest`、`LgFailToPassTest`。后续两个新工程应沿用这个聚合入口风格。

### Runner 选择

| 设备 | Suite |
| --- | --- |
| phone | `CommonPassToPassTest`、`SmPassToPassTest` |
| foldable | `CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest` |
| tablet | `CommonPassToPassTest`、`LgFailToPassTest` |

该选择避免在非目标断点上运行 fail-to-pass 后因断点跳过而误判通过。对于 `answer` 工程，上述 suite 应全部通过；对于 `swe` 工程，pass-to-pass suite 应通过，运行到的 fail-to-pass suite 应失败。

### 公共测试方法

`ResponsiveRepeatLayout` 的 `TestHelper.ets` 已沉淀出后续工程应复用的测试模式：

- 共享单个 `Driver`，只启动一次 `EntryAbility`。
- 通过窗口宽度换算 vp，并按 `<600vp`、`600-839vp`、`>=840vp` 判断为 `sm`、`md`、`lg`。
- 通过稳定 id 切换主 Tab：`main-tab-0` 至 `main-tab-3`。
- 使用 `estimateLanesById()` 根据容器和首个子项 bounds 估算列数。
- 使用 `assertNoHorizontalOverflow()` 验证条目左右边界不超出容器。
- 断点专项用例先判断当前设备断点，非目标断点显式通过，runner 负责只在目标设备选择对应 suite。

### 用例覆盖矩阵

| 页面 / 能力 | 通用可见性 | sm 小屏 | md 中屏 | lg 大屏 |
| --- | --- | --- | --- | --- |
| 主 Tab | 启动和四个 Tab 文案可见 | - | - | - |
| 首页 | 瀑布流、商品项、无横向溢出 | 瀑布流 2 列 | 瀑布流 >2 列 | 瀑布流 >2 列 |
| 分类 | 左侧列表、商品区域可见 | 商品 2 列 | 商品 4 列 | 商品 4 列 |
| 购物车 | 页面可见、列表或空状态 | 列表 1 列 | - | 列表 2 列 |
| 我的 | Tab 文案可见；页面为空状态 | - | - | - |

### 验证结果

`ResponsiveRepeatLayout` 已完成构建和多设备 ohosTest 验证：

| 工程 | 结果摘要 |
| --- | --- |
| `answer` | phone、foldable、tablet 全部通过；`CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest`、`LgFailToPassTest` 在对应设备上均为 failure=0、error=0。 |
| `swe` | phone 的 pass-to-pass 全部通过；foldable 的 `MdFailToPassTest` 2 个用例全部失败；tablet 的 `LgFailToPassTest` 3 个用例全部失败。 |

### 对新工程的复用结论

- 目录结构继续采用 `<LayoutName>/{answer,swe}/products/entry`。
- 用例文件继续采用 `CommonPassToPass`、`SmPassToPass`、`MdPassToPass`、`LgPassToPass`、`MdFailToPass`、`LgFailToPass` 单层命名，按工程实际断点目标裁剪。
- `TestHelper.ets` 保留共享 Driver、断点判断、bounds 断言和溢出断言模式。
- runner 继续按 phone/foldable/tablet 选择 suite，避免断点跳过造成误判。
- 新工程的 fail-to-pass 应各自聚焦目标布局：`DisplacementLayout` 聚焦大屏挪移，`IndentLayout` 聚焦中大屏缩进，不把“无横向溢出”“内容可见”等 SWE 可能已满足的断言放入 fail-to-pass。

## 工程一：DisplacementLayout

### 目标

覆盖官网“挪移布局”的两个典型场景：

- 图文组合：`sm` 上图下文，`lg` 左图右文。
- 底部/侧边导航：`sm` 底部横向 tab，`lg` 左侧纵向 tab。

### 应用页面结构

```text
products/entry/src/main/ets/
├── entryability/EntryAbility.ets
├── pages/Index.ets
├── common/BreakpointSystem.ets
└── components/
    ├── DemoTabs.ets
    ├── IllustrationTextPanel.ets
    └── ArticleListPanel.ets
```

首屏即为可测试体验，不做营销页：

```text
Index
└── Tabs(id: displacement-main-tabs)
    ├── TabContent: 图文
    │   └── GridRow(id: illustration-text-container)
    │       ├── GridCol -> Image/Block(id: illustration-panel)
    │       └── GridCol -> Text/Column(id: text-panel)
    └── TabContent: 列表
        └── ArticleListPanel(id: article-list-panel)
```

### answer 实现要求

- `Tabs`
  - `sm/md`：`barPosition: End`、`vertical: false`、`barWidth: '100%'`、`barHeight: 56`。
  - `lg`：`barPosition: Start`、`vertical: true`、`barWidth: 96`、`barHeight: '100%'`。
- `IllustrationTextPanel`
  - 使用 `GridRow/GridCol`。
  - `sm`：图片 `span: 4`、文本 `span: 4`，上下排列。
  - `md`：可保持上下或半宽并排，不作为强断言。
  - `lg`：图片 `span: 5`、文本 `span: 7`，左右排列。
  - 可使用 `order` 验证内容主次稳定，例如图片始终在前、文本在后。

### swe 缺陷设计

- `Tabs` 固定底部横向，不随 `lg` 切到侧边。
- `IllustrationTextPanel` 固定 `Column` 或固定 `span: 4` 全宽，`lg` 仍上下排列。

### 测试目录

```text
products/entry/src/ohosTest/ets/test/
├── CommonPassToPass.test.ets
├── List.test.ets
├── LgFailToPass.test.ets
├── LgPassToPass.test.ets
├── MdPassToPass.test.ets
├── SmPassToPass.test.ets
├── TestHelper.ets
```

### 测试分组

| 分组文件 | 分组名称 | 用例数量 | 分组定位 |
| --- | --- | ---: | --- |
| `CommonPassToPass.test.ets` | `CommonPassToPassTest` | 4 | 所有设备都应通过的基础冒烟、图文内容可见性、列表页可见性和 Tab 切换。 |
| `SmPassToPass.test.ets` | `SmPassToPassTest` | 3 | 小屏 `sm` 断点基线行为，验证底部横向 Tab、图文上下排列和无横向溢出。 |
| `MdPassToPass.test.ets` | `MdPassToPassTest` | 3 | 中屏 `md` 断点不退化能力，验证未进入大屏挪移形态前仍可读、可用且不溢出。 |
| `LgPassToPass.test.ets` | `LgPassToPassTest` | 2 | 大屏基础不退化能力，验证大屏内容可见和列表页可用，SWE 也应通过。 |
| `LgFailToPass.test.ets` | `LgFailToPassTest` | 4 | 大屏 `lg` 断点挪移增强能力，验证 Tab 侧移、图文左右排列、主次顺序和内容区随侧栏让位。 |

### Runner 选择

| 设备 | Suite |
| --- | --- |
| phone | `CommonPassToPassTest`、`SmPassToPassTest` |
| foldable | `CommonPassToPassTest`、`SmPassToPassTest`、`MdPassToPassTest` |
| tablet | `CommonPassToPassTest`、`LgPassToPassTest`、`LgFailToPassTest` |

对于 `answer` 工程，上述 suite 在对应设备上应全部通过。对于 `swe` 工程，所有 pass-to-pass suite 应通过，tablet 的 `LgFailToPassTest` 应全部失败。挪移布局当前不配置 `MdFailToPassTest`，因为 md 断点没有被设计为必须发生挪移的目标断点。

### 用例明细

#### CommonPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_start_displacement_layout_ability_successfully` | 应用入口可正常启动。 | 启动 `EntryAbility` 后检查 `displacement-main-tabs` 存在。 |
| `should_show_illustration_and_text_content` | 图文 Tab 的核心内容渲染正常。 | 切换到图文 Tab，断言 `illustration-text-container`、`illustration-panel`、`text-panel` 存在。 |
| `should_show_article_list_tab_content` | 列表 Tab 可切换且内容可见。 | 切换到列表 Tab，断言 `article-list-panel` 和至少一个列表项存在。 |
| `should_switch_between_displacement_tabs` | Tab 交互可用。 | 依次点击图文和列表 Tab，断言对应页面标志组件出现。 |

#### SmPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_show_bottom_tab_bar_on_small_breakpoint` | 小屏使用底部横向导航。 | 当前断点为 `sm` 时，比较前两个 tab 的 bounds，断言 `top` 近似相等且第二个 tab 在第一个右侧。 |
| `should_stack_illustration_above_text_on_small_breakpoint` | 小屏图文上下排列。 | 当前断点为 `sm` 时，比较 `illustration-panel` 与 `text-panel` bounds，断言图片区域在文本区域上方。 |
| `should_keep_displacement_content_visible_without_horizontal_overflow_on_small_breakpoint` | 小屏挪移内容不横向溢出。 | 当前断点为 `sm` 时，断言 `illustration-panel`、`text-panel` 左右边界位于 `illustration-text-container` 内。 |

#### MdPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_keep_bottom_tab_bar_on_medium_breakpoint` | 中屏不强制侧边化，仍保持可用底部导航。 | 当前断点为 `md` 时，比较前两个 tab 的 bounds，断言 tab 仍可见且横向排列。 |
| `should_keep_illustration_and_text_readable_on_medium_breakpoint` | 中屏图文区域可读，不出现遮挡。 | 当前断点为 `md` 时，断言图文区域均可见，且两个区域 bounds 不互相覆盖。 |
| `should_keep_displacement_content_visible_without_horizontal_overflow_on_medium_breakpoint` | 中屏内容不横向溢出。 | 当前断点为 `md` 时，断言图文关键区域左右边界位于容器内。 |

说明：挪移布局主要求在 `lg` 断点发生侧边导航和左右图文挪移；`md` 断点不强制侧边化，因此这些用例属于 pass-to-pass，不应放入 fail-to-pass。

#### LgPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_keep_large_breakpoint_displacement_content_visible` | 大屏基础内容不退化。 | 当前断点为 `lg` 时，断言图文容器、图片区、文本区仍可见。 |
| `should_keep_article_list_available_on_large_breakpoint` | 大屏列表 Tab 仍可切换并显示内容。 | 当前断点为 `lg` 时，切换到列表 Tab，断言 `article-list-panel` 和至少一个列表项存在。 |

#### LgFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_move_tab_bar_to_side_on_large_breakpoint` | 大屏 Tab 从底部挪移到左侧。 | 当前断点为 `lg` 时，比较前两个 tab 的 bounds，断言 `left` 近似相等且第二个 tab 在第一个下方。 |
| `should_place_illustration_and_text_side_by_side_on_large_breakpoint` | 大屏图文由上下排列挪移为左右排列。 | 当前断点为 `lg` 时，比较 `illustration-panel` 与 `text-panel` bounds，断言二者左右排列。 |
| `should_keep_illustration_left_of_text_on_large_breakpoint` | 大屏图文主次顺序稳定。 | 当前断点为 `lg` 时，断言 `illustration-panel.right <= text-panel.left + tolerance`。 |
| `should_shift_content_right_of_side_tab_bar_on_large_breakpoint` | 大屏内容区为侧边导航让位。 | 当前断点为 `lg` 时，先断言主 Tabs 为左侧纵向，再比较侧边首个 tab（`displacement-main-tab-0`）与首个主内容块（例如 `illustration-panel` 或列表首项）的 bounds，要求 `content.left >= tab.right + minGap`；固定底部 Tabs、只切到侧边但开启 `barOverlap(true)`、或未给 TabContent 留出左侧空间的 SWE 都应失败。 |

### 覆盖矩阵

| 能力 | 通用可见性 | sm 小屏 | md 中屏 | lg 大屏 |
| --- | --- | --- | --- | --- |
| 应用启动 | 入口和主 Tabs 可见 | - | - | - |
| Tab 导航 | 图文/列表 Tab 可切换 | 底部横向 | 底部横向可用 | 左侧纵向 |
| 图文组合 | 图文容器、图片区、文本区可见 | 上图下文 | 可读且不遮挡 | 左图右文 |
| 溢出保护 | - | 图文不横向溢出 | 图文不横向溢出 | 大屏基础内容可见 |

## 工程二：IndentLayout

### 目标

覆盖官网“缩进布局”的典型场景：

- 单列文章/表单内容在 `sm` 接近全宽。
- 在 `md/lg` 通过 `GridRow/GridCol span + offset` 居中收窄，形成左右留白。
- 大屏内容宽度有上限，不随窗口无限拉伸。

### 应用页面结构

```text
products/entry/src/main/ets/
├── entryability/EntryAbility.ets
├── pages/Index.ets
├── common/BreakpointSystem.ets
└── components/
    ├── ReadingPage.ets
    └── SettingsForm.ets
```

首屏以阅读/表单内容为主：

```text
Index
└── Scroll(id: indent-page-scroll)
    └── GridRow(id: indent-grid)
        └── GridCol
            └── Column(id: indent-content)
                ├── Text(id: indent-title)
                ├── Column(id: reading-card-0)
                ├── Column(id: reading-card-1)
                └── Column(id: settings-form)
```

### answer 实现要求

- `GridRow`
  - `columns: { sm: 4, md: 8, lg: 12, xl: 12 }`
  - `breakpoints` 与项目断点一致。
- `GridCol`
  - `sm`：`span: 4`、`offset: 0`，内容全宽。
  - `md`：`span: 6`、`offset: 1`，内容居中。
  - `lg/xl`：`span: 8`、`offset: 2`，内容居中。
- 内容列可加 `constraintSize({ maxWidth: 840 })`，防止 PC/2in1 上过宽。

### swe 缺陷设计

- 内容容器固定 `width('100%')`，没有 `GridCol span + offset` 缩进能力，导致 `md/lg` 内容仍铺满父容器。
- 没有最大宽度约束，`lg/xl` 阅读行过长。
- 上述缺陷应让 `MdFailToPassTest` 和 `LgFailToPassTest` 中每条用例都失败，避免出现“只缺 offset 但宽度断言通过”的不确定 SWE 形态。

### 测试目录

```text
products/entry/src/ohosTest/ets/test/
├── CommonPassToPass.test.ets
├── List.test.ets
├── LgFailToPass.test.ets
├── LgPassToPass.test.ets
├── MdFailToPass.test.ets
├── MdPassToPass.test.ets
├── SmPassToPass.test.ets
├── TestHelper.ets
```

### 测试分组

| 分组文件 | 分组名称 | 用例数量 | 分组定位 |
| --- | --- | ---: | --- |
| `CommonPassToPass.test.ets` | `CommonPassToPassTest` | 4 | 所有设备都应通过的基础冒烟、阅读内容可见性、表单内容可见性和页面滚动能力。 |
| `SmPassToPass.test.ets` | `SmPassToPassTest` | 4 | 小屏 `sm` 断点基线行为，验证内容近全宽、阅读卡片和表单不横向溢出。 |
| `MdPassToPass.test.ets` | `MdPassToPassTest` | 2 | 中屏 `md` 断点不退化能力，验证内容可见和卡片不横向溢出，SWE 也应通过。 |
| `MdFailToPass.test.ets` | `MdFailToPassTest` | 2 | 中屏 `md` 断点缩进增强能力，验证单列内容居中和宽度收窄，SWE 应全部失败。 |
| `LgPassToPass.test.ets` | `LgPassToPassTest` | 2 | 大屏 `lg` 断点不退化能力，验证内容可见和卡片不横向溢出，SWE 也应通过。 |
| `LgFailToPass.test.ets` | `LgFailToPassTest` | 3 | 大屏 `lg` 断点缩进增强能力，验证居中留白、更大 gutter 和内容宽度上限，SWE 应全部失败。 |

### Runner 选择

| 设备 | Suite |
| --- | --- |
| phone | `CommonPassToPassTest`、`SmPassToPassTest` |
| foldable | `CommonPassToPassTest`、`SmPassToPassTest`、`MdPassToPassTest`、`MdFailToPassTest` |
| tablet | `CommonPassToPassTest`、`LgPassToPassTest`、`LgFailToPassTest` |

对于 `answer` 工程，上述 suite 在对应设备上应全部通过。对于 `swe` 工程，所有 pass-to-pass suite 应通过，foldable 的 `MdFailToPassTest` 和 tablet 的 `LgFailToPassTest` 应全部失败。

### 用例明细

#### CommonPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_start_indent_layout_ability_successfully` | 应用入口可正常启动。 | 启动 `EntryAbility` 后检查 `indent-page-scroll` 和 `indent-content` 存在。 |
| `should_show_reading_content` | 阅读内容可见。 | 断言 `indent-title`、`reading-card-0`、`reading-card-1` 存在。 |
| `should_show_settings_form_content` | 表单内容可见。 | 断言 `settings-form` 以及关键表单行存在。 |
| `should_keep_indent_page_scrollable` | 缩进页面可滚动且不阻塞内容访问。 | 对 `indent-page-scroll` 执行滚动，断言滚动后底部表单或尾部内容仍可见。 |

#### SmPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_show_reading_content_on_small_breakpoint` | 小屏阅读内容正常展示。 | 当前断点为 `sm` 时，断言标题、阅读卡片和表单内容可见。 |
| `should_use_nearly_full_width_content_on_small_breakpoint` | 小屏内容接近全宽。 | 当前断点为 `sm` 时，计算 `indent-content.width / indent-grid.width`，断言大于等于 0.92。 |
| `should_keep_reading_cards_visible_without_horizontal_overflow_on_small_breakpoint` | 小屏阅读卡片不横向溢出。 | 当前断点为 `sm` 时，断言 `reading-card-0`、`reading-card-1` 左右边界位于 `indent-content` 内。 |
| `should_keep_form_fields_visible_without_horizontal_overflow_on_small_breakpoint` | 小屏表单区域不横向溢出。 | 当前断点为 `sm` 时，断言 `settings-form` 及关键表单行左右边界位于 `indent-content` 内。 |

#### MdPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_show_reading_content_on_medium_breakpoint` | 中屏阅读内容不退化。 | 当前断点为 `md` 时，断言标题、阅读卡片和表单内容可见。 |
| `should_keep_reading_cards_visible_without_horizontal_overflow_on_medium_breakpoint` | 中屏卡片不横向溢出。 | 当前断点为 `md` 时，断言阅读卡片左右边界位于 `indent-content` 内。 |

#### MdFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_center_single_column_content_on_medium_breakpoint` | 中屏单列内容水平居中并形成有效留白。 | 当前断点为 `md` 时，比较 `indent-content` 到 `indent-grid` 左右 gutter，断言左右 gutter 均大于 `indent-grid.width * 0.08`，且差值小于等于 `8px`；全宽或靠左的 SWE 会失败。 |
| `should_reduce_single_column_width_on_medium_breakpoint` | 中屏内容宽度收窄形成缩进。 | 当前断点为 `md` 时，计算 `indent-content.width / indent-grid.width`，断言小于等于 0.82；固定 `width('100%')` 的 SWE 会失败。 |

#### LgPassToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_show_reading_content_on_large_breakpoint` | 大屏阅读内容不退化。 | 当前断点为 `lg` 时，断言标题、阅读卡片和表单内容可见。 |
| `should_keep_reading_cards_visible_without_horizontal_overflow_on_large_breakpoint` | 大屏卡片不横向溢出。 | 当前断点为 `lg` 时，断言阅读卡片左右边界位于 `indent-content` 内。 |

#### LgFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_center_single_column_content_on_large_breakpoint` | 大屏单列内容水平居中并形成有效留白。 | 当前断点为 `lg` 时，比较 `indent-content` 到 `indent-grid` 左右 gutter，断言左右 gutter 均大于 `indent-grid.width * 0.12`，且差值小于等于 `8px`；靠左或全宽的 SWE 会失败。 |
| `should_keep_larger_side_gutters_on_large_breakpoint` | 大屏两侧留白更明显。 | 当前断点为 `lg` 时，计算 `indent-content.width / indent-grid.width`，断言小于等于 0.72；固定全宽的 SWE 会失败。 |
| `should_keep_single_column_content_width_bounded_on_large_breakpoint` | 大屏内容宽度有上限。 | 当前断点为 `lg` 时，断言 `indent-content` 宽度不超过设计上限或满足相对宽度上限；缺少 `constraintSize` 或等效上限的 SWE 会失败。 |

### 覆盖矩阵

| 能力 | 通用可见性 | sm 小屏 | md 中屏 | lg 大屏 |
| --- | --- | --- | --- | --- |
| 应用启动 | 入口、滚动容器、内容列可见 | - | - | - |
| 阅读内容 | 标题和阅读卡片可见 | 接近全宽 | 居中收窄 | 居中且留白更大 |
| 表单内容 | 表单区域可见 | 表单不横向溢出 | - | - |
| 缩进能力 | - | 全宽基线 | `span + offset` 居中缩进 | 居中缩进并限制最大宽度 |
| 溢出保护 | - | 卡片和表单不溢出 | pass-to-pass 验证卡片不溢出 | pass-to-pass 验证卡片不溢出 |

## 共享 TestHelper 能力

两个工程各自保留一份 `TestHelper.ets`，接口保持一致，便于评分器复用，并沿用 `ResponsiveRepeatLayout` 中共享 `Driver`、启动一次入口 Ability、按运行时窗口宽度判断断点的写法：

- `getDriver()`
- `prepareEntryAbility()`
- `getWindowVpWidth(driver, bundleName)`
- `getCurrentBreakpoint(driver, bundleName)`
- `waitForComponentById(driver, id)`
- `componentExistsById(driver, id)`
- `getBoundsById(driver, id)`
- `assertHorizontal(driver, firstId, secondId)`
- `assertVertical(driver, firstId, secondId)`
- `assertNoHorizontalOverflow(driver, containerId, childIds)`
- `assertCenteredInContainer(driver, containerId, contentId, tolerance)`
- `assertFirstComponentStartsAfter(driver, contentId, obstacleId, minGap)`
- `assertWidthRatioAtLeast(driver, containerId, contentId, minRatio)`
- `assertWidthRatioAtMost(driver, containerId, contentId, maxRatio)`

## 测试聚合入口

两个工程的 `List.test.ets` 均按 `ResponsiveRepeatLayout` 的单层文件模式注册：

```typescript
import commonPassToPassTest from './CommonPassToPass.test';
import smPassToPassTest from './SmPassToPass.test';
import mdPassToPassTest from './MdPassToPass.test';
import mdFailToPassTest from './MdFailToPass.test';
import lgPassToPassTest from './LgPassToPass.test';
import lgFailToPassTest from './LgFailToPass.test';

export default function testsuite() {
  commonPassToPassTest();
  smPassToPassTest();
  mdPassToPassTest();
  mdFailToPassTest();
  lgPassToPassTest();
  lgFailToPassTest();
}
```

说明：`DisplacementLayout` 不创建 `MdFailToPass.test.ets` 时，对应聚合入口不导入 `mdFailToPassTest()`；上方示例表示包含全部分组的 `IndentLayout` 聚合形态。

## 设备矩阵

| 工程 | Common | Phone / sm | Foldable / md | Tablet / lg |
| --- | --- | --- | --- | --- |
| DisplacementLayout | 基础启动、可见性、切换 | `SmPassToPass` 必跑 | `MdPassToPass` 验证中屏不退化 | `LgPassToPass` 必跑；`LgFailToPass` 必须在 SWE 下失败 |
| IndentLayout | 基础启动、可见性、滚动 | `SmPassToPass` 必跑 | `MdPassToPass` 必跑；`MdFailToPass` 必须在 SWE 下失败 | `LgPassToPass` 必跑；`LgFailToPass` 必须在 SWE 下失败 |

## Checklist

- [x] 已确认挪移布局、缩进布局必须拆成两个独立鸿蒙工程。
- [x] 已重新设计 `DisplacementLayout` 工程结构。
- [x] 已重新设计 `IndentLayout` 工程结构。
- [x] 已按 `ResponsiveRepeatLayout` 风格为两个工程分别列出 common、sm、md、lg 测试文件。
- [x] 已为两个工程分别列出全部 `it(...)` 用例。
- [x] 已参考 `ResponsiveRepeatLayout/docs/TestDesign.md` 补充两个工程的测试用例设计表。
- [x] 已将中大屏不退化断言拆入 `MdPassToPass` / `LgPassToPass`，并确保 `FailToPass` 只保留 SWE 下应失败的断言。
- [ ] 用户确认独立工程结构和用例矩阵。
- [ ] 创建 `DisplacementLayout/{answer,swe}` 工程。
- [ ] 创建 `IndentLayout/{answer,swe}` 工程。
- [ ] 编写两个工程的页面和稳定测试 id。
- [ ] 编写两个工程的 ohosTest。
- [ ] 编译两个 answer 工程主包和 ohosTest 包。
- [ ] 在 Phone、Foldable、Tablet 完成验证并记录结果。

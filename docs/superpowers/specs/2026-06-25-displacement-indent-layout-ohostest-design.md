# Displacement And Indent Layout ohosTest Design Spec

## 设计约束

- 挪移布局、缩进布局分别是独立鸿蒙工程，不放入 `ResponsiveRepeatLayout`。
- 每个布局工程采用和当前题库一致的双工程形态：
  - `answer/`：包含正确多设备适配实现，所有测试最终应通过。
  - `swe/`：剥离或缺失目标适配能力，`CommonPassToPass`、`SmPassToPass` 应通过，`MdFailToPass`、`LgFailToPass` 用于暴露待修复问题。
- 用例文件命名参考 `ResponsiveRepeatLayout`，按 common 和断点拆分为 `CommonPassToPass.test.ets`、`SmPassToPass.test.ets`、`MdFailToPass.test.ets`、`LgFailToPass.test.ets`。
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

### ohosTest 目录

```text
products/entry/src/ohosTest/ets/test/
├── CommonPassToPass.test.ets
├── List.test.ets
├── LgFailToPass.test.ets
├── MdFailToPass.test.ets
├── SmPassToPass.test.ets
├── TestHelper.ets
```

### CommonPassToPass 用例列表

`CommonPassToPass.test.ets`

- `it('should_start_displacement_layout_ability_successfully')`
- `it('should_show_illustration_and_text_content')`
- `it('should_show_article_list_tab_content')`
- `it('should_switch_between_displacement_tabs')`

### SmPassToPass 用例列表

`SmPassToPass.test.ets`

- `it('should_show_bottom_tab_bar_on_small_breakpoint')`
- `it('should_stack_illustration_above_text_on_small_breakpoint')`
- `it('should_keep_displacement_content_visible_without_horizontal_overflow_on_small_breakpoint')`

### MdFailToPass 用例列表

`MdFailToPass.test.ets`

- `it('should_keep_bottom_tab_bar_on_medium_breakpoint')`
- `it('should_keep_illustration_and_text_readable_on_medium_breakpoint')`
- `it('should_keep_displacement_content_visible_without_horizontal_overflow_on_medium_breakpoint')`

说明：挪移布局主要求在 `lg` 断点发生侧边导航和左右图文挪移；`md` 断点不强制侧边化，主要验证中屏不退化、不溢出。

### LgFailToPass 用例列表

`LgFailToPass.test.ets`

- `it('should_move_tab_bar_to_side_on_large_breakpoint')`
- `it('should_place_illustration_and_text_side_by_side_on_large_breakpoint')`
- `it('should_keep_illustration_left_of_text_on_large_breakpoint')`
- `it('should_keep_side_tab_bar_width_bounded_on_large_breakpoint')`
- `it('should_keep_displacement_content_visible_without_horizontal_overflow_on_large_breakpoint')`

### 关键测试断言

- bottom tab：前两个 tab 的 `top` 近似相等，第二个 tab 在第一个右侧。
- side tab：前两个 tab 的 `left` 近似相等，第二个 tab 在第一个下方。
- 上下图文：`illustration-panel.bottom <= text-panel.top + tolerance`。
- 左右图文：`illustration-panel.right <= text-panel.left + tolerance`。
- 侧边 tab 宽度：`tabsBarWidth / windowWidth <= 0.20` 或固定接近 `96vp`。

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

- 内容容器固定 `width('100%')`，没有 `GridCol offset`。
- 或只设置 `span`，不设置 `offset`，导致内容靠左而非居中。
- 或没有最大宽度约束，`lg/xl` 阅读行过长。

### ohosTest 目录

```text
products/entry/src/ohosTest/ets/test/
├── CommonPassToPass.test.ets
├── List.test.ets
├── LgFailToPass.test.ets
├── MdFailToPass.test.ets
├── SmPassToPass.test.ets
├── TestHelper.ets
```

### CommonPassToPass 用例列表

`CommonPassToPass.test.ets`

- `it('should_start_indent_layout_ability_successfully')`
- `it('should_show_reading_content')`
- `it('should_show_settings_form_content')`
- `it('should_keep_indent_page_scrollable')`

### SmPassToPass 用例列表

`SmPassToPass.test.ets`

- `it('should_show_reading_content_on_small_breakpoint')`
- `it('should_use_nearly_full_width_content_on_small_breakpoint')`
- `it('should_keep_reading_cards_visible_without_horizontal_overflow_on_small_breakpoint')`
- `it('should_keep_form_fields_visible_without_horizontal_overflow_on_small_breakpoint')`

### MdFailToPass 用例列表

`MdFailToPass.test.ets`

- `it('should_center_single_column_content_on_medium_breakpoint')`
- `it('should_reduce_single_column_width_on_medium_breakpoint')`
- `it('should_keep_indented_reading_cards_without_horizontal_overflow_on_medium_breakpoint')`

### LgFailToPass 用例列表

`LgFailToPass.test.ets`

- `it('should_center_single_column_content_on_large_breakpoint')`
- `it('should_keep_larger_side_gutters_on_large_breakpoint')`
- `it('should_keep_single_column_content_width_bounded_on_large_breakpoint')`
- `it('should_keep_indented_reading_cards_without_horizontal_overflow_on_large_breakpoint')`

### 关键测试断言

- 小屏近全宽：`indent-content.width / indent-grid.width >= 0.92`。
- 中屏缩进：`indent-content.width / indent-grid.width <= 0.82`，左右 gutter 差值小于等于 `8px`。
- 大屏缩进：`indent-content.width / indent-grid.width <= 0.72`，左右 gutter 差值小于等于 `8px`。
- 大屏宽度上限：`indent-content.width <= 840vp` 的像素换算值；若不做 vp 换算，使用相对比例 + 设备宽度阈值组合断言。
- 无溢出：`reading-card-*` 和 `settings-form` 的左右 bounds 在 `indent-content` 内。

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
- `assertWidthRatioAtLeast(driver, containerId, contentId, minRatio)`
- `assertWidthRatioAtMost(driver, containerId, contentId, maxRatio)`

## 测试聚合入口

两个工程的 `List.test.ets` 均按 `ResponsiveRepeatLayout` 的单层文件模式注册：

```typescript
import commonPassToPassTest from './CommonPassToPass.test';
import smPassToPassTest from './SmPassToPass.test';
import mdFailToPassTest from './MdFailToPass.test';
import lgFailToPassTest from './LgFailToPass.test';

export default function testsuite() {
  commonPassToPassTest();
  smPassToPassTest();
  mdFailToPassTest();
  lgFailToPassTest();
}
```

## 设备矩阵

| 工程 | Common | Phone / sm | Foldable / md | Tablet / lg |
| --- | --- | --- | --- | --- |
| DisplacementLayout | 基础启动、可见性、切换 | `SmPassToPass` 必跑 | `MdFailToPass` 验证中屏不退化 | `LgFailToPass` 必跑 |
| IndentLayout | 基础启动、可见性、滚动 | `SmPassToPass` 必跑 | `MdFailToPass` 必跑 | `LgFailToPass` 必跑 |

## 用例设计表

本节参考 `ResponsiveRepeatLayout/docs/TestDesign.md` 的组织方式，按工程分别列出测试分组、runner 选择、用例明细和覆盖矩阵。

### DisplacementLayout 测试分组

| 分组文件 | 分组名称 | 用例数量 | 分组定位 |
| --- | --- | ---: | --- |
| `CommonPassToPass.test.ets` | `CommonPassToPassTest` | 4 | 所有设备都应通过的基础冒烟、图文内容可见性、列表页可见性和 Tab 切换。 |
| `SmPassToPass.test.ets` | `SmPassToPassTest` | 3 | 小屏 `sm` 断点基线行为，验证底部横向 Tab、图文上下排列和无横向溢出。 |
| `MdFailToPass.test.ets` | `MdFailToPassTest` | 3 | 中屏 `md` 断点稳定性，验证挪移布局在未进入大屏侧边形态前仍可读、可用且不溢出。 |
| `LgFailToPass.test.ets` | `LgFailToPassTest` | 5 | 大屏 `lg` 断点挪移增强能力，验证 Tab 侧移、图文左右排列、主次顺序、侧边栏宽度和无横向溢出。 |

### DisplacementLayout Runner 选择

| 设备 | Suite |
| --- | --- |
| phone | `CommonPassToPassTest`、`SmPassToPassTest` |
| foldable | `CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest` |
| tablet | `CommonPassToPassTest`、`LgFailToPassTest` |

对于 `answer` 工程，上述 suite 在对应设备上应全部通过。对于 `swe` 工程，phone 的 pass-to-pass suite 应通过，tablet 的 `LgFailToPassTest` 应失败；`MdFailToPassTest` 可根据中屏缺陷设计决定是否作为 fail-to-pass 强判。

### DisplacementLayout 用例明细

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

#### MdFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_keep_bottom_tab_bar_on_medium_breakpoint` | 中屏不强制侧边化，仍保持可用底部导航。 | 当前断点为 `md` 时，比较前两个 tab 的 bounds，断言 tab 仍可见且横向排列。 |
| `should_keep_illustration_and_text_readable_on_medium_breakpoint` | 中屏图文区域可读，不出现遮挡。 | 当前断点为 `md` 时，断言图文区域均可见，且两个区域 bounds 不互相覆盖。 |
| `should_keep_displacement_content_visible_without_horizontal_overflow_on_medium_breakpoint` | 中屏内容不横向溢出。 | 当前断点为 `md` 时，断言图文关键区域左右边界位于容器内。 |

#### LgFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_move_tab_bar_to_side_on_large_breakpoint` | 大屏 Tab 从底部挪移到左侧。 | 当前断点为 `lg` 时，比较前两个 tab 的 bounds，断言 `left` 近似相等且第二个 tab 在第一个下方。 |
| `should_place_illustration_and_text_side_by_side_on_large_breakpoint` | 大屏图文由上下排列挪移为左右排列。 | 当前断点为 `lg` 时，比较 `illustration-panel` 与 `text-panel` bounds，断言二者左右排列。 |
| `should_keep_illustration_left_of_text_on_large_breakpoint` | 大屏图文主次顺序稳定。 | 当前断点为 `lg` 时，断言 `illustration-panel.right <= text-panel.left + tolerance`。 |
| `should_keep_side_tab_bar_width_bounded_on_large_breakpoint` | 大屏侧边导航宽度受控。 | 当前断点为 `lg` 时，断言侧边 tab 宽度不超过窗口宽度的 20%，或接近设计值 `96vp`。 |
| `should_keep_displacement_content_visible_without_horizontal_overflow_on_large_breakpoint` | 大屏挪移后内容不横向溢出。 | 当前断点为 `lg` 时，断言图文区域左右边界位于容器内。 |

### DisplacementLayout 覆盖矩阵

| 能力 | 通用可见性 | sm 小屏 | md 中屏 | lg 大屏 |
| --- | --- | --- | --- | --- |
| 应用启动 | 入口和主 Tabs 可见 | - | - | - |
| Tab 导航 | 图文/列表 Tab 可切换 | 底部横向 | 底部横向可用 | 左侧纵向 |
| 图文组合 | 图文容器、图片区、文本区可见 | 上图下文 | 可读且不遮挡 | 左图右文 |
| 溢出保护 | - | 图文不横向溢出 | 图文不横向溢出 | 图文不横向溢出 |

### IndentLayout 测试分组

| 分组文件 | 分组名称 | 用例数量 | 分组定位 |
| --- | --- | ---: | --- |
| `CommonPassToPass.test.ets` | `CommonPassToPassTest` | 4 | 所有设备都应通过的基础冒烟、阅读内容可见性、表单内容可见性和页面滚动能力。 |
| `SmPassToPass.test.ets` | `SmPassToPassTest` | 4 | 小屏 `sm` 断点基线行为，验证内容近全宽、阅读卡片和表单不横向溢出。 |
| `MdFailToPass.test.ets` | `MdFailToPassTest` | 3 | 中屏 `md` 断点缩进增强能力，验证单列内容居中、宽度收窄和卡片不溢出。 |
| `LgFailToPass.test.ets` | `LgFailToPassTest` | 4 | 大屏 `lg` 断点缩进增强能力，验证居中留白、更大 gutter、内容宽度上限和无横向溢出。 |

### IndentLayout Runner 选择

| 设备 | Suite |
| --- | --- |
| phone | `CommonPassToPassTest`、`SmPassToPassTest` |
| foldable | `CommonPassToPassTest`、`SmPassToPassTest`、`MdFailToPassTest` |
| tablet | `CommonPassToPassTest`、`LgFailToPassTest` |

对于 `answer` 工程，上述 suite 在对应设备上应全部通过。对于 `swe` 工程，phone 的 pass-to-pass suite 应通过，foldable 的 `MdFailToPassTest` 和 tablet 的 `LgFailToPassTest` 应失败。

### IndentLayout 用例明细

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

#### MdFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_center_single_column_content_on_medium_breakpoint` | 中屏单列内容水平居中。 | 当前断点为 `md` 时，比较 `indent-content` 到 `indent-grid` 左右 gutter，断言差值小于等于 `8px`。 |
| `should_reduce_single_column_width_on_medium_breakpoint` | 中屏内容宽度相对小屏收窄。 | 当前断点为 `md` 时，计算 `indent-content.width / indent-grid.width`，断言小于等于 0.82。 |
| `should_keep_indented_reading_cards_without_horizontal_overflow_on_medium_breakpoint` | 中屏缩进后卡片不横向溢出。 | 当前断点为 `md` 时，断言阅读卡片左右边界位于 `indent-content` 内。 |

#### LgFailToPassTest

| 用例名 | 测试点 | 主要步骤与断言 |
| --- | --- | --- |
| `should_center_single_column_content_on_large_breakpoint` | 大屏单列内容水平居中。 | 当前断点为 `lg` 时，比较 `indent-content` 到 `indent-grid` 左右 gutter，断言差值小于等于 `8px`。 |
| `should_keep_larger_side_gutters_on_large_breakpoint` | 大屏两侧留白更明显。 | 当前断点为 `lg` 时，计算 `indent-content.width / indent-grid.width`，断言小于等于 0.72。 |
| `should_keep_single_column_content_width_bounded_on_large_breakpoint` | 大屏内容宽度有上限。 | 当前断点为 `lg` 时，断言 `indent-content` 宽度不超过设计上限或满足相对宽度上限。 |
| `should_keep_indented_reading_cards_without_horizontal_overflow_on_large_breakpoint` | 大屏缩进后阅读卡片不横向溢出。 | 当前断点为 `lg` 时，断言阅读卡片左右边界位于 `indent-content` 内。 |

### IndentLayout 覆盖矩阵

| 能力 | 通用可见性 | sm 小屏 | md 中屏 | lg 大屏 |
| --- | --- | --- | --- | --- |
| 应用启动 | 入口、滚动容器、内容列可见 | - | - | - |
| 阅读内容 | 标题和阅读卡片可见 | 接近全宽 | 居中收窄 | 居中且留白更大 |
| 表单内容 | 表单区域可见 | 表单不横向溢出 | - | - |
| 缩进能力 | - | 全宽基线 | `span + offset` 居中缩进 | 居中缩进并限制最大宽度 |
| 溢出保护 | - | 卡片和表单不溢出 | 卡片不溢出 | 卡片不溢出 |

## Checklist

- [x] 已确认挪移布局、缩进布局必须拆成两个独立鸿蒙工程。
- [x] 已重新设计 `DisplacementLayout` 工程结构。
- [x] 已重新设计 `IndentLayout` 工程结构。
- [x] 已按 `ResponsiveRepeatLayout` 风格为两个工程分别列出 common、sm、md、lg 测试文件。
- [x] 已为两个工程分别列出全部 `it(...)` 用例。
- [x] 已参考 `ResponsiveRepeatLayout/docs/TestDesign.md` 补充两个工程的测试用例设计表。
- [ ] 用户确认独立工程结构和用例矩阵。
- [ ] 创建 `DisplacementLayout/{answer,swe}` 工程。
- [ ] 创建 `IndentLayout/{answer,swe}` 工程。
- [ ] 编写两个工程的页面和稳定测试 id。
- [ ] 编写两个工程的 ohosTest。
- [ ] 编译两个 answer 工程主包和 ohosTest 包。
- [ ] 在 Phone、Foldable、Tablet 完成验证并记录结果。

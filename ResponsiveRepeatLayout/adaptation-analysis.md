# 工程适配分析

生成时间：2026-06-22

## 结论

本工程已经具备多设备响应式实现。本次任务不新增或重写适配代码，只冻结并保留四个一级 Tab 展示链路中的现有实现，删除与原子示例无关的业务链路。

## EntryAbility 现状

- 已调用 `setKeyboardAvoidMode(KeyboardAvoidMode.OFFSET_WITH_CARET)`。
- `BreakpointSystem.register(uiContext)` 位于入口页面 `views/Index.ets`。
- `WindowUtil.setUIContext()` 已保存 UI 上下文。
- 未使用 `AppStorage.setOrCreate('windowStage', windowStage)`。
- 未注册 `avoidAreaChange` 监听。
- 根据用户“现有多设备适配代码不需要更改”的要求，上述现状保持不变；仅删除分享、推送、转场、外部 Want 等无关初始化。

## module.json5 现状

- `orientation`：未声明。
- EntryAbility `supportWindowMode`：未声明。
- `minWindowWidth` / `minWindowHeight`：未声明。
- `preferMultiWindowOrientation`：未声明。
- 原工程另有 SecondAbility 与卡片扩展，均不属于四 Tab 原子工程，列入删除候选。

## 四个一级 Tab

### `views/MainEntry.ets`

```text
NavDestination
└── Tabs [h:100%, tabs]
    ├── 首页 TabContent
    ├── 分类 TabContent
    ├── 购物车 TabContent
    └── 我的 TabContent
```

- 手机使用底部 Tabs；大屏使用左侧 Tabs。
- 已有联动属性：`barPosition`、`vertical`、`barWidth`、`barMode`。
- 原代码未显式设置 `barHeight`；本任务按用户要求冻结，不补写适配属性。

### `tabviews/HomePage.ets` 与 `components/HomePageContent.ets`

```text
Column [h:100%]
├── Header [fixed height]
├── Refresh [flexible]
│   └── Scroll
│       ├── Swiper [aspectRatio by breakpoint]
│       ├── Category horizontal repeat
│       ├── Activity cards [flexGrow]
│       └── ProductWaterFlow [responsive columns]
```

冻结点：横幅比例、平板搜索栏、分类项分布、商品 WaterFlow 列模板。

### `tabviews/CategoryPage.ets` 与 `components/product_category/views/ProductCategory.ets`

```text
Row [h:100%]
├── Category List [w:30%, maxWidth:240]
└── Column [flexible]
    ├── ChipGroup
    └── GridRow [xs:2, md:4]
```

冻结点：左侧分类宽度约束、GridRow 重复布局列数。

### `tabviews/CartPage.ets` 与 `components/shopping_cart/components/CartListView.ets`

```text
Column [h:100%]
├── Cart header
├── List [lanes: phone 1 / lg 2]
│   └── CartCard × N
├── Recommended ProductWaterFlow
└── Cart control panel
```

冻结点：`List.lanes` 在 LG 断点切换为 2 列，卡片和结算区布局保持不变。

### `tabviews/ProfilePage.ets`

```text
Column [h:100%]
└── Scroll
    ├── User info / check-in / main menu
    ├── Order repeat row
    └── Submenu List [lanes: phone 1 / lg 2]
```

冻结点：LG 用户信息分栏、子菜单 `List.lanes`。

## 保留模块依赖闭包

- `entry`：应用入口、四个 Tab，以及购物车、分类、商品流三组 UI 组件。
- `lib_foundation`：断点系统、全局状态、窗口与 Toast 基础设施。
- `lib_widget`：四 Tab 使用的标题栏、加载、空状态与骨架组件。
- `lib_network`：首页、分类、商品流、购物车的本地 Mock API 和类型。

购物车、分类与商品流原 HAR 已合入 entry，根目录不再保留 `components/`、`features/`。

## 删除候选

- `features/order`、`features/points`、`features/setting`、`features/shopping`、`features/member`。
- 登录、支付、分享、地址、会员、反馈、搜索、扫码、评价、图片预览、通知、隐私协议等无关 components 分包。
- SecondAbility、EntryFormAbility、SplashPage、SafePage、预加载、卡片快照、截图和说明文档。

## 已知 UX 信号预检

- Tabs 大屏切侧边导航已存在，但未显式设置 `barHeight`；按用户冻结要求不调整。
- CartListView 已使用断点 `lanes`，符合重复布局原子场景。
- ProductCategory 已使用 GridRow 多列结构。
- ProductWaterFlow 已使用动态 `columnsTemplate`。
- 多处固定图片尺寸属于卡片视觉规格，不在本次删减中改写。

## 删除安全规则

删除模块前必须同时满足：根 `build-profile.json5` 不再登记、`products/entry/oh-package.json5` 不再依赖、保留源码中不存在包名 import、Hvigor 阶段编译通过。

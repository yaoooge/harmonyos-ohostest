# 响应式布局-重复布局原子工程 Phase Plan

> 执行原则：本计划经确认后才开始实施。现有多设备适配实现保持不变，不重写断点系统、响应式布局、Tabs 侧边导航或各重复布局组件，只删除与四个一级 Tab 无关的业务代码和依赖。

## 一、目标

基于 `init/ComprehensiveMall1.0.7` 的完整副本，产出目录名为 `ResponsiveRepeatLayout` 的独立 HarmonyOS 工程。工程只呈现首页、分类、购物车、我的四个一级 Tab，保留四个页面现有的数据展示以及已有多设备适配效果；所有原二级路由入口统一提示“功能暂未开放”；购物车默认展示 6 个商品卡片；删除无关分包、截图、README 和其他演示资料；最终通过 Hvigor debug 编译。

## 二、冻结范围

以下已有实现不做功能性改写：

- `products/entry/src/main/ets/views/MainEntry.ets` 中手机底部 Tabs 与大屏左侧 Tabs 的切换逻辑。
- `lib_foundation` 中 `BreakpointSystem` 及窗口断点监听逻辑。
- 四个一级 Tab 内现有 `List.lanes`、瀑布流列数、分栏、宽度约束等多设备适配代码。
- 屏幕旋转、折叠开合时保持当前 Tab 的状态逻辑。

允许的最小代码改动仅包括：移除已删除模块的 import/调用、将路由动作改为统一 Toast、改用本地静态展示数据、预置 6 个购物车商品，以及为编译清理不可达代码。

## 三、目标结构

业务界面只保留单一 `entry` 构建模块；基础能力继续由 `lib_foundation`、`lib_widget`、`lib_network` 三个 commons HAR 提供。四个 Tab 所需的购物车、分类、商品流组件及资源全部收拢到 entry 内，根目录不再保留 `components/` 与 `features/`；根 `build-profile.json5` 最终只登记 entry 和三个 commons HAR。

## 四、阶段计划

### Phase 0：建立可回退基线

- 核对新工程路径与 Git 状态，确认源工程 `/init` 未被修改。
- 记录初始模块、entry 依赖、四个 Tab 入口和路由调用点。
- 执行一次原始工程 debug 编译，记录基线结果；如原始工程自身存在环境问题，先单独记录，不把它混入删减改动。
- 建立首次基线提交，确保后续每个阶段都可独立回退。

验收：工作目录正确、源工程无改动、基线构建结果已记录、Git 工作树干净。

### Phase 1：锁定四个一级 Tab 的展示依赖

- 从 `products/entry/src/main/ets/commons/Constants.ets` 确认仅保留首页、分类、购物车、我的四个入口。
- 逐页追踪以下文件的组件、资源和数据依赖：
  - `products/entry/src/main/ets/tabviews/HomePage.ets`
  - `products/entry/src/main/ets/tabviews/CategoryPage.ets`
  - `products/entry/src/main/ets/tabviews/CartPage.ets`
  - `products/entry/src/main/ets/tabviews/ProfilePage.ets`
- 生成保留清单和删除候选清单；任何仍被四个 Tab 展示路径引用的文件不得删除。
- 将扫描结论写入根目录 `adaptation-analysis.md`，特别标记不得修改的响应式代码位置。

验收：四个 Tab 的展示依赖闭包完整，删除候选无反向引用。

### Phase 2：将二级业务动作统一降级为 Toast

- 新增 entry 内统一的“功能暂未开放”提示方法，避免每个点击点重复实现。
- 仅替换四个 Tab 及其直接展示组件中的路由跳转、登录、结算、搜索、扫码、会员、订单、设置等入口。
- 保留一级 Tab 切换行为；保留购物车商品数量、选择状态等页面内交互。
- 删除路由替换后不再使用的参数类型、import 和回调。

验收：四个 Tab 可正常切换；点击原二级入口只出现 Toast；无页面跳转；当前 Tab 不被重置。

### Phase 3：固化四个 Tab 的展示数据

- 将首页、分类、我的页面所需展示数据改为 entry 内本地 Mock，字段和展示数量以原页面当前展示为准。
- 为购物车准备 6 个结构完整的商品对象，覆盖图片、名称、规格、单价、数量、选中状态等卡片字段。
- 页面加载不再依赖登录态、远端接口或被删除业务模块。
- 不改变现有重复布局组件及断点适配表达式。

验收：离线启动后四个 Tab 都有完整数据；购物车恰好显示 6 张商品卡片；不同窗口宽度下沿用原有布局变化。

### Phase 4：收拢四 Tab 依赖并删除无关分包

- 将四个 Tab 必需且体量较小的组件、模型、样式和资源迁入 `products/entry/src/main`。
- 每迁移一组依赖，就同步更新 `products/entry/oh-package.json5`、根 `build-profile.json5` 和对应 import。
- 删除已确认无引用的 `features/*`、`components/*` 和多余 `commons/*` 模块；保留 entry 运行与响应式基础设施确实需要的代码。
- 每批删除后执行一次 entry debug 编译，出现缺失符号时依据引用关系恢复或迁移，不修改适配逻辑规避问题。

验收：根构建配置只登记实际模块；entry 不再引用已删除包；阶段编译通过。

### Phase 5：删除非工程交付信息

- 删除 `screenshot/`、各模块 `screenshots/`、`snapshots/`、README、CHANGELOG、LICENSE 等与原子工程运行和编译无关的资料。
- 删除不再使用的 `preload/`、`EntryCard/`、测试目录、表单卡片能力、SecondAbility 及相应资源与配置。
- 清理空目录、失效路由表项、无效权限、无关 metadata 和未使用资源引用。
- 保留 Hvigor、应用资源、签名占位配置及 debug 编译必需文件。

验收：工程目录无截图与 README；配置不存在指向已删除文件的引用。

### Phase 6：完整编译与交付核验

- 依据 HarmonyOS Hvigor 规范执行依赖解析和 entry debug 编译。
- 清理构建缓存后再执行一次完整编译，排除增量缓存造成的假通过。
- 检查 Git diff，确认 `/init` 未修改、现有多设备适配逻辑未被重写。
- 更新 `CHECKLIST.md`，记录编译命令、结果和未覆盖的真机验证项。

验收：Hvigor 返回成功并生成 debug 构建产物；清理缓存后复编仍通过；所有必做项已勾选。

### Phase 7：将剩余 UI 分包合入 entry

- 将 `components/module_shopping_cart` 原样迁入 `products/entry/src/main/ets/components/shopping_cart`。
- 将 `components/module_product_category` 原样迁入 `products/entry/src/main/ets/components/product_category`。
- 将 `features/product` 原样迁入 `products/entry/src/main/ets/components/product`。
- 合并三个分包的媒体资源；同名同内容资源只保留 entry 中的一份，不修改现有响应式布局实现。
- 将 entry 对三个 HAR 的包引用改为本地相对路径，并接管分类页直接使用的 `ui-skeleton` 依赖。
- 从根 `build-profile.json5` 与 entry 依赖中移除三个分包，删除根 `components/`、`features/` 目录。
- 执行原子工程回归测试、依赖解析、Hvigor clean 和完整 debug 编译。

验收：根目录不存在 `components/`、`features/`；构建模块仅为 entry 与三个 commons HAR；四个 Tab 数据和响应式实现保持存在；clean 后 Hvigor 编译通过。

## 五、提交策略

每个 Phase 至少形成一个独立提交，推荐提交顺序：

1. `chore: establish responsive repeat layout baseline`
2. `refactor: replace secondary navigation with toast`
3. `feat: add local tab display data and six cart items`
4. `refactor: remove unrelated feature modules`
5. `chore: clean nonessential project assets`
6. `chore: verify hvigor build`
7. `refactor: merge ui feature modules into entry`

## 六、风险控制

- 不根据目录名称直接删除模块，必须先确认 entry 和四 Tab 展示依赖中不存在引用。
- 不以“重写一个更简单页面”替代删减，避免丢失已有数据展示与适配行为。
- 任何响应式相关文件出现修改时，必须在 diff 中逐行确认修改只涉及失效依赖或 Toast/Mock 接入。
- UI 分包合入 entry 时只调整物理路径与 import；若编译暴露隐式依赖，显式转交依赖，不借机重写适配实现。

## 七、完成定义

- 新工程是独立 Git 仓库，源工程保持不变。
- 只存在四个一级 Tab 页面入口。
- 四个 Tab 的原有数据展示均保留，购物车默认有 6 个商品卡片。
- 原二级业务入口全部 Toast 提示“功能暂未开放”。
- 现有多设备适配实现未被重写。
- 无无关分包、截图、README 等资料。
- 根目录不再存在 `components/`、`features/`，购物车、分类与商品流源码均位于 entry。
- Hvigor debug 编译通过。

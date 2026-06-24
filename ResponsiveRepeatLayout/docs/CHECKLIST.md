# 响应式布局-重复布局原子工程勾选表

## 实施前

- [x] 已从 `init/ComprehensiveMall1.0.7` 复制为 `ResponsiveRepeatLayout`
- [x] 已在新工程根目录执行 `git init`
- [x] 已确认采用“方案 A：单 entry 原子工程”
- [x] 已确认不重写现有多设备适配代码
- [x] 用户已确认 `PHASE_PLAN.md`，允许开始实施

## Phase 0：基线

- [x] 确认 `/init` 源工程无改动（源文件摘要：`b96af4315fc8dd1c935a1724f04c3087bb31d4d139e1282368cc6832b33f2bb4`）
- [x] 记录初始模块与依赖（根 `build-profile.json5` 共 33 个模块）
- [x] 记录初始 Hvigor debug 编译结果
- [x] 创建 Git 基线提交（`317480f`）

## Phase 1：依赖扫描

- [x] 首页展示依赖已确认
- [x] 分类页展示依赖已确认
- [x] 购物车展示依赖已确认
- [x] 我的页面展示依赖已确认
- [x] 响应式适配冻结点已登记
- [x] 根目录 `adaptation-analysis.md` 已生成
- [x] 删除候选不存在四 Tab 展示链路反向引用

## Phase 2：Toast 降级

- [x] 已提供统一“功能暂未开放”Toast
- [x] 首页二级入口不再路由跳转
- [x] 分类页二级入口不再路由跳转
- [x] 购物车二级入口不再路由跳转
- [x] 我的页面二级入口不再路由跳转
- [x] 四个一级 Tab 切换逻辑保留
- [x] 屏幕旋转/开合不重置当前 Tab 的原实现未修改

## Phase 3：本地展示数据

- [x] 首页本地 Mock 数据展示链路保留
- [x] 分类页本地 Mock 数据展示链路保留
- [x] 我的页面本地展示数据保留
- [x] 购物车预置 6 个商品卡片
- [x] 页面展示使用本地 Mock，购物车不依赖登录态
- [x] 已有重复布局与断点代码未重写

## Phase 4：分包删减

- [x] Phase 4 初次删减已将四个 Tab 依赖收拢为 7 个实际模块
- [x] `products/entry/oh-package.json5` 仅保留实际依赖
- [x] 根 `build-profile.json5` 仅保留实际模块
- [x] 无关 `features` 分包已删除
- [x] 无关 `components` 分包已删除
- [x] 无关 `commons` 代码已裁剪
- [x] entry 不引用已删除模块
- [x] 阶段 Hvigor 编译通过（`BUILD SUCCESSFUL in 3 s 298 ms`）

## Phase 5：资料和配置清理

- [x] 根目录及子模块截图目录已删除
- [x] README/CHANGELOG/LICENSE 等无关资料已删除
- [x] preload 与卡片服务等无关内容已删除
- [x] 无关测试目录已删除
- [x] 无效路由、权限、Ability 与资源引用已清理
- [x] 不存在指向已删除文件的配置

## Phase 6：最终验收

- [x] Hvigor entry debug 编译通过
- [x] 清理缓存后完整复编通过
- [x] debug 构建产物已生成
- [x] `/init` 源工程保持不变（摘要仍为 `b96af4315fc8dd1c935a1724f04c3087bb31d4d139e1282368cc6832b33f2bb4`）
- [x] Git diff 中无四个响应式核心组件实现重写
- [x] 工程只保留四个一级 Tab
- [x] 所有二级入口均 Toast 提示“功能暂未开放”
- [x] 购物车预置数据测试确认恰好 6 个商品卡片
- [x] 本检查表已填写最终编译命令与结果

## Phase 7：UI 分包合入 entry

- [x] 购物车源码已原样迁入 entry
- [x] 分类源码已原样迁入 entry
- [x] 商品流源码已原样迁入 entry
- [x] 三个分包资源已合并且无冲突覆盖
- [x] entry import 与直接依赖已同步
- [x] 根构建配置仅保留 entry 与三个 commons HAR
- [x] 根目录 `components/`、`features/` 已删除
- [x] 响应式关键实现回归测试通过
- [x] Hvigor clean 后完整 debug 编译通过
- [x] Phase 7 编译结果已回填

## 编译记录

- 首次基线编译：`hvigorw --mode project -p product=default assembleApp --analyze=normal --parallel --incremental --no-daemon`，退出码 0，`BUILD SUCCESSFUL in 14 s 280 ms`
- 阶段编译：`hvigorw --mode project -p product=default assembleApp --analyze=normal --parallel --incremental --no-daemon`，退出码 0，`BUILD SUCCESSFUL in 3 s 298 ms`
- 清缓存最终编译：先执行 `hvigorw clean --no-daemon`，再执行完整 `assembleApp` 命令；退出码 0，`BUILD SUCCESSFUL in 4 s 916 ms`
- 原子工程测试：`node --test tests/atomic-project.test.mjs`，7 项通过、0 项失败
- Phase 7 增量编译：完整 `assembleApp` 命令，退出码 0，`BUILD SUCCESSFUL in 6 s 384 ms`
- Phase 7 清缓存编译：`hvigorw clean --no-daemon` 成功，再执行完整 `assembleApp` 命令；退出码 0，`BUILD SUCCESSFUL in 6 s 2 ms`
- 构建产物路径：`build/outputs/default/ResponsiveRepeatLayout-default-unsigned.app`（897K）、`products/entry/build/default/outputs/default/entry-default-unsigned.hap`（1.4M）
- 真机/模拟器多设备验证：未执行，需在 DevEco Studio Previewer、模拟器或真机中验证视觉效果

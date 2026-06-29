# Responsive Repeat Layout Split Design Spec

## Goal

Split the current `ResponsiveRepeatLayout` paired task into three smaller paired HarmonyOS projects that independently assess multi-device adaptive repeat layouts:

- `ResponsiveWaterFlowLayout`: WaterFlow adaptive columns.
- `ResponsiveListLayout`: List adaptive lanes.
- `ResponsiveGridLayout`: Grid adaptive columns.

The first milestone is to complete and verify all three `answer` projects. The second milestone is to create matching `swe` projects by deriving them from the verified `answer` projects and removing only the target adaptive layout code, then verify that all configured `failtopass` suites fail on target devices.

## Current Baseline

The current `ResponsiveRepeatLayout/answer` combines three repeat-layout scenarios in one e-commerce shell with a bottom or side `Tabs` container:

| Existing area | Existing test id | Existing adaptive behavior |
| --- | --- | --- |
| Home product flow | `home-waterflow`, `home-waterflow-item` | `WaterFlow.columnsTemplate` changes from 2 columns on `sm` to more columns on `md/lg`. |
| Cart list | `cart-list`, `cart-list-item` | `List.lanes` changes from 1 lane on `sm` to 2 lanes on `lg`. |
| Category product grid | `category-product-grid`, `category-product-item` | Current implementation uses `GridRow/GridCol`; new split should use native `Grid.columnsTemplate` to test the Grid component directly. |

The split projects should remove the Tab shell. Each app should launch directly into its one tested layout.

## Chosen SWE Strategy

Use the verified split `answer` projects as the source of truth, then derive each `swe` project by removing the target adaptive code.

This is preferred over independently re-splitting the old `swe` project because:

- `answer` and `swe` will share identical data, resources, stable test ids, entry structure, and test helpers.
- `failtopass` failures will isolate the missing adaptive properties instead of accidental page or data differences.
- Future maintenance can compare `answer` and `swe` with small, intentional diffs.

The `swe` projects must keep all pass-to-pass behavior intact. Only the medium and large adaptive column or lane behavior should be missing.

## Top-Level Structure

```text
ResponsiveWaterFlowLayout/
├── answer/
└── swe/

ResponsiveListLayout/
├── answer/
└── swe/

ResponsiveGridLayout/
├── answer/
└── swe/
```

Each `answer` and `swe` directory should be a standalone HarmonyOS project following the existing paired-task shape:

```text
<ProjectName>/<variant>/
├── AppScope/
├── build-profile.json5
├── code-linter.json5
├── hvigor/
├── hvigorfile.ts
├── oh-package.json5
└── products/entry/
    ├── hvigorfile.ts
    ├── oh-package.json5
    └── src/
        ├── main/
        └── ohosTest/
```

All app code should live in the main package under `products/entry/src/main/ets`. Do not keep or introduce `commons/lib_foundation`, `commons/lib_network`, or `commons/lib_widget` modules for these split tasks.

## Shared Main-Package Files

Each project should use a small, local set of files:

```text
products/entry/src/main/ets/
├── entryability/EntryAbility.ets
├── model/
│   ├── DemoData.ets
│   └── Types.ets
├── utils/
│   └── BreakpointSystem.ets
├── components/
│   ├── PageHeader.ets
│   └── <layout-specific components>
└── views/
    └── Index.ets
```

Responsibilities:

- `EntryAbility.ets`: load `views/Index`.
- `Index.ets`: register the local breakpoint system and render the single layout page directly.
- `BreakpointSystem.ets`: local `sm/md/lg` breakpoint tracking using `UIContext.getWindowWidthBreakpoint()`, matching current thresholds.
- `DemoData.ets`: deterministic local data. No network mock modules are needed.
- `PageHeader.ets`: simple visual title and subtitle for the scenario, with stable id.
- Layout-specific components: own the tested `WaterFlow`, `List`, or `Grid` container and expose stable test ids.

## Shared ohosTest Structure

Each project should keep its tests local:

```text
products/entry/src/ohosTest/ets/test/
├── CommonPassToPass.test.ets
├── SmPassToPass.test.ets
├── MdFailToPass.test.ets
├── LgFailToPass.test.ets
├── TestHelper.ets
└── List.test.ets
```

`List.test.ets` registers all suites in this order:

1. `CommonPassToPassTest`
2. `SmPassToPassTest`
3. `MdFailToPassTest`
4. `LgFailToPassTest`

`TestHelper.ets` should retain the useful current patterns:

- Create and reuse a single `Driver`.
- Start `EntryAbility` once per test run.
- Wait for a project-specific root id instead of `main-tabs`.
- Determine breakpoint from active window width in vp:
  - `<600vp`: `sm`
  - `600-839vp`: `md`
  - `>=840vp`: `lg`
- Estimate lanes or columns from rendered bounds.
- Assert no horizontal overflow for every visible item.

## Runner Verification

Use the existing matrix runner from `harmonyos-ohostest-runner`.

For every split `answer` project, run:

```bash
cd harmonyos-ohostest-runner
npm run ohostest:matrix -- --project ../ResponsiveWaterFlowLayout/answer
npm run ohostest:matrix -- --project ../ResponsiveListLayout/answer
npm run ohostest:matrix -- --project ../ResponsiveGridLayout/answer
```

Required `answer` result:

- phone: selected pass-to-pass suites pass.
- foldable: selected pass-to-pass suites and `MdFailToPassTest` pass.
- tablet: selected pass-to-pass suites and `LgFailToPassTest` pass.
- Every executed suite has `failure=0` and `error=0`.

For every split `swe` project, run:

```bash
cd harmonyos-ohostest-runner
npm run ohostest:matrix -- --project ../ResponsiveWaterFlowLayout/swe
npm run ohostest:matrix -- --project ../ResponsiveListLayout/swe
npm run ohostest:matrix -- --project ../ResponsiveGridLayout/swe
```

Required `swe` result:

- All pass-to-pass suites pass.
- Every configured `MdFailToPassTest` case fails on the foldable or `md` target.
- Every configured `LgFailToPassTest` case fails on the tablet or `lg` target.
- No `failtopass` case should pass because of an unrelated skip or missing data condition.

## Project 1: ResponsiveWaterFlowLayout

### Display Content

Show a product discovery feed with uneven card heights:

- Image block with varying aspect ratios.
- Product title.
- Price.
- Short tag row.

Stable ids:

- Root page: `waterflow-page`
- Header: `waterflow-header`
- Container: `adaptive-waterflow`
- Item: `adaptive-waterflow-item`

### Answer Behavior

Use native `WaterFlow`:

| Breakpoint | Expected columns | Key properties |
| --- | ---: | --- |
| `sm` | 2 | `columnsTemplate: repeat(2, 1fr)` |
| `md` | 3 | `columnsTemplate: repeat(3, 1fr)` |
| `lg` | 4 | `columnsTemplate: repeat(4, 1fr)` |

Use responsive `columnsGap` and `rowsGap`, and set `layoutMode: WaterFlowLayoutMode.SLIDING_WINDOW` so column changes do not remount the flow unnecessarily.

### SWE Defect

Keep the WaterFlow fixed at the small-screen template:

- `columnsTemplate: repeat(2, 1fr)` for all breakpoints.
- Keep data, ids, header, and overflow behavior unchanged.

### Tests

`CommonPassToPassTest`:

- `should_start_ability_successfully`
- `should_show_waterflow_page_content`
- `should_show_waterflow_items`
- `should_keep_waterflow_items_without_horizontal_overflow`

`SmPassToPassTest`:

- `should_show_waterflow_as_two_columns_on_small_breakpoint`

`MdFailToPassTest`:

- `should_show_waterflow_as_three_columns_on_medium_breakpoint`

`LgFailToPassTest`:

- `should_show_waterflow_as_four_columns_on_large_breakpoint`

Expected `swe` failtopass failures:

- On `md`, rendered columns remain 2 instead of 3.
- On `lg`, rendered columns remain 2 instead of 4.

## Project 2: ResponsiveListLayout

### Display Content

Show a saved cart or order list with uniform, scan-friendly list cards:

- Thumbnail.
- Product or order title.
- Secondary description.
- Quantity or status.
- Price or timestamp.

Stable ids:

- Root page: `list-page`
- Header: `list-header`
- Container: `adaptive-list`
- Item: `adaptive-list-item`

### Answer Behavior

Use native `List` with `lanes`:

| Breakpoint | Expected lanes | Key properties |
| --- | ---: | --- |
| `sm` | 1 | `lanes(1)` |
| `md` | 2 | `lanes(2, 12)` |
| `lg` | 3 | `lanes(3, 12)` |

Use responsive item spacing:

- `sm`: 8vp row space.
- `md`: 12vp row space.
- `lg`: 16vp row space.

### SWE Defect

Keep the List fixed at the small-screen layout:

- `lanes(1)` for all breakpoints.
- Keep data, ids, cards, and scroll behavior unchanged.

### Tests

`CommonPassToPassTest`:

- `should_start_ability_successfully`
- `should_show_list_page_content`
- `should_show_list_items`
- `should_keep_list_items_without_horizontal_overflow`

`SmPassToPassTest`:

- `should_show_list_as_one_lane_on_small_breakpoint`

`MdFailToPassTest`:

- `should_show_list_as_two_lanes_on_medium_breakpoint`

`LgFailToPassTest`:

- `should_show_list_as_three_lanes_on_large_breakpoint`

Expected `swe` failtopass failures:

- On `md`, rendered lanes remain 1 instead of 2.
- On `lg`, rendered lanes remain 1 instead of 3.

## Project 3: ResponsiveGridLayout

### Display Content

Show a category or feature grid with equal-size tiles:

- Square image or icon area.
- Category title.
- Short count or subtitle.

Stable ids:

- Root page: `grid-page`
- Header: `grid-header`
- Container: `adaptive-grid`
- Item: `adaptive-grid-item`

### Answer Behavior

Use native `Grid` with `columnsTemplate`:

| Breakpoint | Expected columns | Key properties |
| --- | ---: | --- |
| `sm` | 2 | `columnsTemplate: repeat(2, 1fr)` |
| `md` | 3 | `columnsTemplate: repeat(3, 1fr)` |
| `lg` | 4 | `columnsTemplate: repeat(4, 1fr)` |

Use `columnsGap` and `rowsGap` consistently. Keep tiles equal-height with a stable aspect ratio so bounds-based column estimation is reliable.

### SWE Defect

Keep the Grid fixed at the small-screen template:

- `columnsTemplate: repeat(2, 1fr)` for all breakpoints.
- Keep data, ids, header, and tile content unchanged.

### Tests

`CommonPassToPassTest`:

- `should_start_ability_successfully`
- `should_show_grid_page_content`
- `should_show_grid_items`
- `should_keep_grid_items_without_horizontal_overflow`

`SmPassToPassTest`:

- `should_show_grid_as_two_columns_on_small_breakpoint`

`MdFailToPassTest`:

- `should_show_grid_as_three_columns_on_medium_breakpoint`

`LgFailToPassTest`:

- `should_show_grid_as_four_columns_on_large_breakpoint`

Expected `swe` failtopass failures:

- On `md`, rendered columns remain 2 instead of 3.
- On `lg`, rendered columns remain 2 instead of 4.

## Implementation Sequence

1. Create `ResponsiveWaterFlowLayout/answer` from the current project shell, remove tabs and shared library modules, move required breakpoint/data/card code into `products/entry`.
2. Add WaterFlow-specific tests and run the matrix runner until all selected `answer` suites pass.
3. Repeat the same answer split and verification for `ResponsiveListLayout/answer`.
4. Repeat the same answer split and verification for `ResponsiveGridLayout/answer`.
5. Create each `swe` by copying its verified `answer`.
6. Remove only the target adaptive logic from each `swe`:
   - WaterFlow fixed at 2 columns.
   - List fixed at 1 lane.
   - Grid fixed at 2 columns.
7. Run the matrix runner for all three `swe` projects.
8. Confirm pass-to-pass suites pass and all configured fail-to-pass cases fail on their target devices.

Do not proceed to a later project until the previous project's `answer` matrix has passed. Do not create `swe` from an unverified `answer`.

## Acceptance Criteria

The split is complete only when all of these are true:

- The old combined Tab-based assessment is replaced by three independent project directories.
- Each split app launches directly into the target layout; no Tab bar remains.
- All app code needed by each split project lives under `products/entry/src/main/ets`.
- `ResponsiveWaterFlowLayout/answer` passes the runner matrix with `failure=0` and `error=0`.
- `ResponsiveListLayout/answer` passes the runner matrix with `failure=0` and `error=0`.
- `ResponsiveGridLayout/answer` passes the runner matrix with `failure=0` and `error=0`.
- `ResponsiveWaterFlowLayout/swe` pass-to-pass suites pass, and all selected fail-to-pass cases fail.
- `ResponsiveListLayout/swe` pass-to-pass suites pass, and all selected fail-to-pass cases fail.
- `ResponsiveGridLayout/swe` pass-to-pass suites pass, and all selected fail-to-pass cases fail.
- Runner output is recorded or summarized in the final implementation report with device type, suite name, failure count, and error count.

## Non-Goals

- Do not add Navigation split panes, SideBarContainer, hover mode, keyboard adaptation, immersive window behavior, or orientation-specific behavior.
- Do not keep the current e-commerce four-Tab shell.
- Do not depend on network mock libraries for these split apps.
- Do not test private breakpoint utility functions directly.
- Do not make fail-to-pass tests fail through missing ids, empty data, startup failure, or test-only conditionals.

## Self-Review

- No placeholders remain.
- The chosen `swe` strategy is explicit: derive from verified `answer` and remove only target adaptive behavior.
- Each project has one component family and one adaptive assertion family.
- The `answer` and `swe` runner expectations are separated to avoid accepting skipped fail-to-pass cases as success.
- The Grid project uses native `Grid.columnsTemplate`, not the current combined project's `GridRow/GridCol`, so it directly tests grid repeat layout adaptation.

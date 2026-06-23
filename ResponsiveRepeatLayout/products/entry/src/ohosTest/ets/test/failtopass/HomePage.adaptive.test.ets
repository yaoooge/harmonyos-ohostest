import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertNoHorizontalOverflow,
  assertMainTabsVertical,
  clickTabByIndex,
  estimateLanesById,
  getDriver,
  getCurrentBreakpoint,
  prepareEntryAbility,
  waitForComponentById,
} from '../TestHelper';

export default function homePageAdaptiveTest() {
  describe('HomePageAdaptiveTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
      await clickTabByIndex(driver, 0);
      await waitForComponentById(driver, 'home-waterflow', 10);
    });

    it('should_place_tab_bar_at_side_on_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'lg') {
        await assertMainTabsVertical(driver);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_home_waterflow_as_multi_column_layout_on_medium_or_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md' || breakpoint === 'lg') {
        const lanes = await estimateLanesById(driver, 'home-waterflow', 'home-waterflow-item');
        expect(lanes > 2).assertTrue();
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_keep_home_waterflow_items_visible_without_horizontal_overflow_on_medium_or_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md' || breakpoint === 'lg') {
        await assertNoHorizontalOverflow(driver, 'home-waterflow', 'home-waterflow-item');
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

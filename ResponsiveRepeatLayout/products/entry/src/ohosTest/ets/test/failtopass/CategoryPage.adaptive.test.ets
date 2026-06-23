import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver, ON } from '@kit.TestKit';
import {
  assertComponentById,
  clickTabByIndex,
  estimateLanesById,
  getDriver,
  getCurrentBreakpoint,
  prepareEntryAbility,
  waitForComponentById,
} from '../TestHelper';

export default function categoryPageAdaptiveTest() {
  describe('CategoryPageAdaptiveTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
      await clickTabByIndex(driver, 1);
      await waitForComponentById(driver, 'category-product-grid', 10);
    });

    it('should_keep_category_left_list_within_expected_width_on_medium_or_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md' || breakpoint === 'lg') {
        await assertComponentById(driver, 'category-left-list');
        const leftList = await driver.findComponent(ON.id('category-left-list'));
        const bounds = await leftList.getBounds();
        expect(px2vp(bounds.right - bounds.left) <= 240).assertTrue();
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_category_products_as_four_columns_on_medium_or_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md' || breakpoint === 'lg') {
        const lanes = await estimateLanesById(driver, 'category-product-grid', 'category-product-item');
        expect(lanes).assertEqual(4);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

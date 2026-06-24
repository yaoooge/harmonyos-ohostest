import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  clickTabByIndex,
  estimateLanesById,
  getCurrentBreakpoint,
  getDriver,
  prepareEntryAbility,
  waitForComponentById,
} from './TestHelper';

export default function mdFailToPassTest() {
  describe('MdFailToPassTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
    });

    it('should_show_home_waterflow_as_multi_column_layout_on_medium_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 0);
      await waitForComponentById(driver, 'home-waterflow', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md') {
        const lanes = await estimateLanesById(driver, 'home-waterflow', 'home-waterflow-item');
        expect(lanes > 2).assertTrue();
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_category_products_as_four_columns_on_medium_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 1);
      await waitForComponentById(driver, 'category-product-grid', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md') {
        const lanes = await estimateLanesById(driver, 'category-product-grid', 'category-product-item');
        expect(lanes).assertEqual(4);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

  });
}

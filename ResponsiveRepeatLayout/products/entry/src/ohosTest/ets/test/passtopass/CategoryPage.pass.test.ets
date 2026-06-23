import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertComponentById,
  assertComponentByText,
  clickTabByIndex,
  estimateLanesById,
  getDriver,
  getCurrentBreakpoint,
  prepareEntryAbility,
  waitForComponentById,
} from '../TestHelper';

export default function categoryPagePassTest() {
  describe('CategoryPagePassTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
      await clickTabByIndex(driver, 1);
      await waitForComponentById(driver, 'category-left-list', 10);
    });

    it('should_switch_to_category_tab_and_show_category_content', Level.LEVEL2, async (done: Function) => {
      await assertComponentByText(driver, '分类');
      await assertComponentById(driver, 'category-left-list');
      done();
    });

    it('should_show_category_side_list_and_product_area', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'category-left-list');
      await assertComponentById(driver, 'category-product-grid');
      done();
    });

    it('should_show_category_products_as_two_columns_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm') {
        const lanes = await estimateLanesById(driver, 'category-product-grid', 'category-product-item');
        expect(lanes).assertEqual(2);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

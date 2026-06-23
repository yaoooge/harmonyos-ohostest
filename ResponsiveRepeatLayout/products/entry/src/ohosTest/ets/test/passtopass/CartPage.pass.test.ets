import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertComponentById,
  assertComponentByText,
  clickTabByIndex,
  componentExistsById,
  estimateLanesById,
  getDriver,
  getCurrentBreakpoint,
  prepareEntryAbility,
  waitForComponentById,
} from '../TestHelper';

export default function cartPagePassTest() {
  describe('CartPagePassTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
      await clickTabByIndex(driver, 2);
      await waitForComponentById(driver, 'cart-page', 10);
    });

    it('should_switch_to_cart_tab_and_show_cart_content', Level.LEVEL2, async (done: Function) => {
      await assertComponentByText(driver, '购物车');
      await assertComponentById(driver, 'cart-page');
      done();
    });

    it('should_show_cart_product_list_or_empty_state', Level.LEVEL2, async (done: Function) => {
      const hasList = await componentExistsById(driver, 'cart-list');
      const hasEmpty = await componentExistsById(driver, 'cart-empty-state');
      expect(hasList || hasEmpty).assertTrue();
      done();
    });

    it('should_show_cart_list_as_one_lane_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm' && await componentExistsById(driver, 'cart-list')) {
        const lanes = await estimateLanesById(driver, 'cart-list', 'cart-list-item');
        expect(lanes).assertEqual(1);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

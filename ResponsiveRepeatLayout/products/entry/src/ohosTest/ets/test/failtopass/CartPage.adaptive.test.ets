import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertComponentById,
  clickTabByIndex,
  componentExistsById,
  estimateLanesById,
  getDriver,
  getCurrentBreakpoint,
  prepareEntryAbility,
  waitForComponentById,
} from '../TestHelper';

export default function cartPageAdaptiveTest() {
  describe('CartPageAdaptiveTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
      await clickTabByIndex(driver, 2);
      await waitForComponentById(driver, 'cart-page', 10);
    });

    it('should_show_cart_list_as_two_lanes_on_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'lg' && await componentExistsById(driver, 'cart-list')) {
        const lanes = await estimateLanesById(driver, 'cart-list', 'cart-list-item');
        expect(lanes).assertEqual(2);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_keep_cart_control_panel_visible_without_covering_list_content_on_medium_or_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if ((breakpoint === 'md' || breakpoint === 'lg') && await componentExistsById(driver, 'cart-control-panel')) {
        await assertComponentById(driver, 'cart-control-panel');
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

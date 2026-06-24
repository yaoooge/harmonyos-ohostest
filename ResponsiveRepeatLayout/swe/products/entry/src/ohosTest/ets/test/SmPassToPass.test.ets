import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertMainTabsHorizontal,
  clickTabByIndex,
  componentExistsById,
  estimateLanesById,
  getCurrentBreakpoint,
  getDriver,
  prepareEntryAbility,
  waitForComponentById,
} from './TestHelper';

export default function smPassToPassTest() {
  describe('SmPassToPassTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
    });

    it('should_place_tab_bar_at_bottom_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm') {
        await assertMainTabsHorizontal(driver);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_home_waterflow_as_two_columns_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 0);
      await waitForComponentById(driver, 'home-waterflow', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm') {
        const lanes = await estimateLanesById(driver, 'home-waterflow', 'home-waterflow-item');
        expect(lanes).assertEqual(2);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_category_products_as_two_columns_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 1);
      await waitForComponentById(driver, 'category-product-grid', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm') {
        const lanes = await estimateLanesById(driver, 'category-product-grid', 'category-product-item');
        expect(lanes).assertEqual(2);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_cart_list_as_one_lane_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 2);
      await waitForComponentById(driver, 'cart-page', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm' && await componentExistsById(driver, 'cart-list')) {
        const lanes = await estimateLanesById(driver, 'cart-list', 'cart-list-item');
        expect(lanes).assertEqual(1);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_profile_sections_as_vertical_layout_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 3);
      await waitForComponentById(driver, 'profile-page', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm') {
        const lanes = await estimateLanesById(driver, 'profile-sub-menu-list', 'profile-sub-menu-item');
        expect(lanes).assertEqual(1);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_profile_sub_menu_as_one_lane_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 3);
      await waitForComponentById(driver, 'profile-page', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm') {
        const lanes = await estimateLanesById(driver, 'profile-sub-menu-list', 'profile-sub-menu-item');
        expect(lanes).assertEqual(1);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertComponentById,
  assertComponentByText,
  assertMainTabsHorizontal,
  estimateLanesById,
  getDriver,
  getCurrentBreakpoint,
  prepareEntryAbility,
} from '../TestHelper';

export default function homePagePassTest() {
  describe('HomePagePassTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
    });

    it('should_show_home_tab_content_after_app_launch', Level.LEVEL2, async (done: Function) => {
      await assertComponentByText(driver, '首页');
      await assertComponentByText(driver, '分类');
      await assertComponentByText(driver, '购物车');
      await assertComponentByText(driver, '我的');
      done();
    });

    it('should_show_search_bar_on_home_page', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'search');
      done();
    });

    it('should_show_home_waterflow_product_items', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'home-waterflow');
      await assertComponentById(driver, 'home-waterflow-item');
      done();
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
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'sm') {
        const lanes = await estimateLanesById(driver, 'home-waterflow', 'home-waterflow-item');
        expect(lanes).assertEqual(2);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

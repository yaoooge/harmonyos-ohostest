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

export default function profilePagePassTest() {
  describe('ProfilePagePassTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
      await clickTabByIndex(driver, 3);
      await waitForComponentById(driver, 'profile-page', 10);
    });

    it('should_switch_to_profile_tab_and_show_profile_content', Level.LEVEL2, async (done: Function) => {
      await assertComponentByText(driver, '我的');
      await assertComponentById(driver, 'profile-page');
      done();
    });

    it('should_show_profile_order_and_menu_sections', Level.LEVEL2, async (done: Function) => {
      await assertComponentByText(driver, '我的订单');
      await assertComponentByText(driver, '地址管理');
      done();
    });

    it('should_show_profile_sections_as_vertical_layout_on_small_breakpoint', Level.LEVEL2, async (done: Function) => {
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

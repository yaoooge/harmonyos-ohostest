import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertMainTabsHorizontal,
  clickTabByIndex,
  estimateLanesById,
  getCurrentBreakpoint,
  getDriver,
  prepareEntryAbility,
  waitForComponentById,
} from './TestHelper';

export default function mdPassToPassTest() {
  describe('MdPassToPassTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
    });

    it('should_place_tab_bar_at_bottom_on_medium_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md') {
        await assertMainTabsHorizontal(driver);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_profile_sections_as_vertical_layout_on_medium_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 3);
      await waitForComponentById(driver, 'profile-page', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md') {
        const lanes = await estimateLanesById(driver, 'profile-sub-menu-list', 'profile-sub-menu-item');
        expect(lanes).assertEqual(1);
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_profile_sub_menu_as_one_lane_on_medium_breakpoint', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 3);
      await waitForComponentById(driver, 'profile-page', 10);
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md') {
        const lanes = await estimateLanesById(driver, 'profile-sub-menu-list', 'profile-sub-menu-item');
        expect(lanes).assertEqual(1);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

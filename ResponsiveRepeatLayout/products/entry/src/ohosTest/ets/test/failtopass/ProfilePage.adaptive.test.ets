import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertComponentById,
  clickTabByIndex,
  estimateLanesById,
  getDriver,
  getCurrentBreakpoint,
  prepareEntryAbility,
  waitForComponentById,
} from '../TestHelper';

export default function profilePageAdaptiveTest() {
  describe('ProfilePageAdaptiveTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
      await clickTabByIndex(driver, 3);
      await waitForComponentById(driver, 'profile-page', 10);
    });

    it('should_show_profile_user_area_and_menu_area_as_split_layout_on_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'lg') {
        await assertComponentById(driver, 'profile-lg-split');
        await assertComponentById(driver, 'profile-user-area');
        await assertComponentById(driver, 'profile-menu-area');
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_show_profile_sub_menu_as_two_lanes_on_large_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'lg') {
        const lanes = await estimateLanesById(driver, 'profile-sub-menu-list', 'profile-sub-menu-item');
        expect(lanes).assertEqual(2);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

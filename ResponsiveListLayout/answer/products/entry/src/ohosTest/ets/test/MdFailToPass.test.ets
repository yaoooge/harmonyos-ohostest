import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import { estimateLanesById, getCurrentBreakpoint, getDriver, prepareEntryAbility } from './TestHelper';

export default function mdFailToPassTest() {
  describe('MdFailToPassTest', () => {
    let driver: Driver;
    let bundleName: string;

    beforeAll(async () => {
      driver = getDriver();
      bundleName = await prepareEntryAbility();
    });

    it('should_show_list_as_two_lanes_on_medium_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md') {
        const lanes = await estimateLanesById(driver, 'order-list', 'order-list-item0');
        expect(lanes).assertEqual(2);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

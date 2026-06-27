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

    it('should_show_waterflow_as_three_columns_on_medium_breakpoint', Level.LEVEL2, async (done: Function) => {
      const breakpoint = await getCurrentBreakpoint(driver, bundleName);
      if (breakpoint === 'md') {
        const lanes = await estimateLanesById(driver, 'product-waterflow', 'product-waterflow-item0');
        expect(lanes).assertEqual(3);
      } else {
        expect(true).assertTrue();
      }
      done();
    });
  });
}

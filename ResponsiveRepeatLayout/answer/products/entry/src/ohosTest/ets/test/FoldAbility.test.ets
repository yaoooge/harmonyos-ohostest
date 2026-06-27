import { describe, beforeAll, afterAll, it, expect } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import { triggerFold, triggerRotation, sleep } from '../util/FoldTrigger';

export default function foldTest() {
  describe('FoldControlTest', () => {
    let driver: Driver | undefined;

    beforeAll(async () => {
      driver = Driver.create();
    });

    afterAll(async () => {
      driver = undefined;
    });

    it('trigger_rotation_left', 0, async () => {
      await triggerRotation('left', 2000);
      expect(true).assertTrue();
    });

    it('trigger_rotation_right', 0, async () => {
      await triggerRotation('right', 2000);
      expect(true).assertTrue();
    });

    it('trigger_fold_open', 0, async () => {
      await triggerFold('open', 3000);
      expect(true).assertTrue();
    });

    it('trigger_fold_half_open', 0, async () => {
      await triggerFold('half-open', 3000);
      expect(true).assertTrue();
    });

    it('trigger_fold_close', 0, async () => {
      await triggerFold('close', 3000);
      expect(true).assertTrue();
    });
  });
}

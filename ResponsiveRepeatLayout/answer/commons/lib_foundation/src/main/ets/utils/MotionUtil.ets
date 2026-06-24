import { BusinessError } from '@kit.BasicServicesKit';
import { motion } from '@kit.MultimodalAwarenessKit';
import { UtilLog as Logger } from '@hw-agconnect/util-log';

const TAG: string = '[MotionUtil]';

@ObservedV2
export class MotionUtil {
  @Trace
  public static holdingHand: motion.HoldingHandStatus = motion.HoldingHandStatus.NOT_HELD;

  public static registerHoldingHandEvent() {
    try {
      if (canIUse('SystemCapability.MultimodalAwareness.Motion')) {
        motion.on('holdingHandChanged', MotionUtil._holdingHandChangeCallback);
      } else {
        Logger.info(TAG, 'cannot add holding hand changed event. error: unsupported SystemCapability');
      }
    } catch (err) {
      let error = err as BusinessError;
      Logger.info(TAG, 'cannot add holding hand changed event. error:' + error.message);
    }
  }

  public static unregisterHoldingHandEvent() {
    try {
      motion.off('holdingHandChanged');
    } catch (err) {
      let error = err as BusinessError;
      Logger.info(TAG, 'cannot remove holding hand changed event. error:' + error.message);
    }
  }

  private static _holdingHandChangeCallback = (data: motion.HoldingHandStatus) => {
    MotionUtil.holdingHand = data;
  };
}
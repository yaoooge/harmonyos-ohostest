import { util } from '@kit.ArkTS';
import { PersistenceV2 } from '@kit.ArkUI';

@ObservedV2
export class GlobalStateMgr {
  @Trace
  public cartVersion: string = util.generateRandomUUID(false);
  @Trace
  public cartTotal: number = 0;
}

class IData {
  public get global() {
    return PersistenceV2.connect(
      GlobalStateMgr,
      'GlobalStateMgr',
      () => new GlobalStateMgr(),
    )!;
  }
}

const iData = new IData();

export { iData };

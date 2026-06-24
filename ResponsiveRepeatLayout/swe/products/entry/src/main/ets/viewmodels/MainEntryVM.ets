import { iData } from 'lib_foundation';

@ObservedV2
export class MainEntryVM {
  @Trace curIndex: number = 0;
  @Trace firstBackTime: number = 0;

  public initData(): void {
    iData.global.isLogin = true;
    iData.global.userInfo.nickname = 'HarmonyOS 用户';
    iData.global.userInfo.anonymousPhone = '138****8888';
    iData.global.userInfo.isMember = true;
  }
}

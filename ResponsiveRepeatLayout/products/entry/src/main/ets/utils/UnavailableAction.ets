import { WindowUtil } from 'lib_foundation';

export class UnavailableAction {
  public static show(): void {
    WindowUtil.toast('功能暂未开放');
  }
}

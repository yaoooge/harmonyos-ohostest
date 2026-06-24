import { MainMenuOption, SubMenuOption } from '../commons/Enums';
import { MainMenuItem, SubMenuItem } from '../commons/Types';
import { UnavailableAction } from './UnavailableAction';

export class ProfileUtil {
  public static readonly MAIN_MENU_LIST: MainMenuItem[] = [
    {
      type: MainMenuOption.COUPON,
      icon: $r('app.media.ic_mine_coupon'),
      label: '优惠券',
    },
    {
      type: MainMenuOption.COLLECTION,
      icon: $r('app.media.ic_mine_collection'),
      label: '我的收藏',
    },
    {
      type: MainMenuOption.MESSAGE,
      icon: $r('app.media.ic_mine_message'),
      label: '我的消息',
    },
    {
      type: MainMenuOption.ADDRESS,
      icon: $r('app.media.ic_mine_address'),
      label: '地址管理',
    },
  ];
  public static readonly SUB_MENU_LIST: SubMenuItem[] = [
    {
      type: SubMenuOption.VIEW_HISTORY,
      icon: $r('sys.symbol.arrow_counterclockwise_clock'),
      label: '浏览历史',
    },
    {
      type: SubMenuOption.FEEDBACK,
      icon: $r('sys.symbol.doc_plaintext_and_pencil'),
      label: '意见反馈',
    },
    {
      type: SubMenuOption.CUSTOM_SERVICE,
      icon: $r('sys.symbol.service'),
      label: '联系客服',
    },
    {
      type: SubMenuOption.SETTINGS,
      icon: $r('sys.symbol.gearshape'),
      label: '设置',
    },
  ];

  public static handleMainMenuClick(_menu: MainMenuOption): void {
    UnavailableAction.show();
  }

  public static handleSubMenuClick(_menu: SubMenuOption): void {
    UnavailableAction.show();
  }

  public static login(): void {
    UnavailableAction.show();
  }
}

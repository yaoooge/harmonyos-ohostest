import { common } from '@kit.AbilityKit';
import { PageHeader } from '../components/PageHeader';
import { OrderList } from '../components/OrderList';
import { BreakpointSystem } from '../utils/BreakpointSystem';

@Entry
@ComponentV2
struct Index {
  aboutToAppear(): void {
    const uiContext = this.getUIContext();
    uiContext.getHostContext() as common.UIAbilityContext;
    BreakpointSystem.register(uiContext);
  }

  aboutToDisappear(): void {
    BreakpointSystem.unregister();
  }

  build() {
    Column() {
      PageHeader({
        title: '订单中心',
        subtitle: '管理待付款、待收货和已完成订单',
        testId: 'list-header',
      })
      OrderList()
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F4F6F8')
    .id('list-page')
  }
}

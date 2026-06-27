import { common } from '@kit.AbilityKit';
import { PageHeader } from '../components/PageHeader';
import { ProductWaterFlow } from '../components/ProductWaterFlow';
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
        title: '瀑布流推荐',
        subtitle: '不同高度商品卡片随窗口宽度切换列数',
        testId: 'waterflow-header',
      })
      ProductWaterFlow()
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F4F6F8')
    .id('waterflow-page')
  }
}

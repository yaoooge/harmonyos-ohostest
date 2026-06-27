import { common } from '@kit.AbilityKit';
import { PageHeader } from '../components/PageHeader';
import { AdaptiveGrid } from '../components/AdaptiveGrid';
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
        title: '分类宫格',
        subtitle: '等宽网格随窗口宽度切换列数',
        testId: 'grid-header',
      })
      AdaptiveGrid()
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F4F6F8')
    .id('grid-page')
  }
}

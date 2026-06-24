import { common } from '@kit.AbilityKit';
import { BreakpointSystem, routerStack, WindowUtil } from 'lib_foundation';

@Entry
@ComponentV2
struct Index {
  @Local
  stack: NavPathStack = new NavPathStack()

  aboutToAppear(): void {
    const uiContext = this.getUIContext()
    const abilityContext = uiContext.getHostContext() as common.UIAbilityContext;
    const abilityName: string = abilityContext.abilityInfo.name;
    BreakpointSystem.register(uiContext)
    WindowUtil.setUIContext(abilityName, uiContext)
    routerStack.registerStack(abilityName, this.stack, uiContext)
    this.stack.pushPath({ name: 'MainEntry' }, false)
  }

  build() {
    Navigation(this.stack) {
    }
    .backgroundColor($r('app.color.background_color_grey'))
    .hideBackButton(true)
    .hideNavBar(true)
    .mode(NavigationMode.Stack)
  }
}

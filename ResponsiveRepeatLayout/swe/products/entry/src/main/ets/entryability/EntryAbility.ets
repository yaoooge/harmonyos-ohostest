import UIAbility from '@ohos.app.ability.UIAbility';
import { KeyboardAvoidMode } from '@ohos.arkui.UIContext';
import window from '@ohos.window';
import { ColorModeUtil, routerStack, WindowUtil } from 'lib_foundation';

export default class EntryAbility extends UIAbility {
  onCreate(): void {
    ColorModeUtil.applySavedColorMode(this.context);
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('views/Index', (): void => {
      windowStage
        .getMainWindowSync()
        .getUIContext()
        .setKeyboardAvoidMode(KeyboardAvoidMode.OFFSET_WITH_CARET);
    });
  }

  onWindowStageActive(): void {
    routerStack.setActive('EntryAbility');
    WindowUtil.setActiveContext('EntryAbility');
  }
}

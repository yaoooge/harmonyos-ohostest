import { buildCommonEmptyStatus, NavTitleBar } from 'lib_widget';

@Builder
export function buildProfilePage() {
  ProfilePage();
}

@ComponentV2
export struct ProfilePage {
  build() {
    Column() {
      NavTitleBar({
        title: '我的',
      })

      buildCommonEmptyStatus('暂无数据')
    }
    .height('100%')
    .width('100%')
    .backgroundColor($r('app.color.background_color_grey'))
    .id('profile-page')
    .expandSafeArea([SafeAreaType.SYSTEM, SafeAreaType.CUTOUT], [SafeAreaEdge.TOP])
    .transition(TransitionEffect.OPACITY.animation({ duration: 600 }))
  }
}

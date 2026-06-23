import { CommonSymbol, NavTitleBar } from 'lib_widget';

@ComponentV2
export struct CartPageHeader {
  // 购物车页面是否是作为子路由页面
  @Param isChildRoute: boolean = false;
  // 是否展示管理按钮
  @Param showEdit: boolean = false;
  // 是否编辑态
  @Param isEdit: boolean = false;
  // 切换编辑的回调
  @Event changeEdit: () => void = () => {
  };
  // 作为子页面时，返回事件回调
  @Event onBack: () => void = () => {
  };

  build() {
    NavTitleBar({
      title: '购物车',
      bgColor: $r('app.color.background_color_grey'),
    }) {
      if (this.showEdit) {
        Row() {
          if (this.isEdit) {
            CommonSymbol({
              src: $r('sys.symbol.checkmark'),
            })
              .transition(TransitionEffect.OPACITY.animation({ duration: 200, curve: Curve.Ease }))
          } else {
            CommonSymbol({
              src: $r('sys.symbol.square_and_pencil'),
            })
              .transition(TransitionEffect.OPACITY.animation({ duration: 200, curve: Curve.Ease }))
          }
        }
        .layoutWeight(1)
        .justifyContent(FlexAlign.End)
        .onClick(() => {
          this.changeEdit();
        })
      }
    }
  }
}
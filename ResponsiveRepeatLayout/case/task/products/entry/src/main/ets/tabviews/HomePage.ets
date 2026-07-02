import { HomePageContent } from '../components/HomePageContent';
import { HomePageVM } from '../viewmodels/HomePageVM';

@ComponentV2
export struct HomePage {
  private vm: HomePageVM = new HomePageVM();
  scroller: Scroller = new Scroller();

  aboutToAppear(): void {
    this.vm.loadHomePage()
  }

  build(): void {
    Column() {
      this.buildHeader()

      Refresh({
        refreshing: $$this.vm.isRefreshing,
        builder: this.buildRefreshingContent,
      }) {
        Scroll(this.scroller) {
          Column() {
            HomePageContent({
              categoryList: this.vm.categoryList,
              scroller: this.scroller,
              handleClickCategory: (id) => {
                this.vm.jumpToCategoryPage(id);
              },
            })
              .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
          }
          .justifyContent(FlexAlign.Center)
          .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
        }
        .scrollBar(BarState.Off)
        .align(Alignment.Top)
        .layoutWeight(1)
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
      }
      .layoutWeight(1)
      .onStateChange((state) => {
        this.vm.onRefreshStateChange(state)
      })
      .backgroundColor($r('app.color.background_color_grey'))
      .expandSafeArea([SafeAreaType.SYSTEM, SafeAreaType.CUTOUT], [SafeAreaEdge.BOTTOM]);
    }
    .width($r('app.string.size_percent_full'))
    .height($r('app.string.size_percent_full'))
    .backgroundColor($r('app.color.background_color_grey'))
    .alignItems(HorizontalAlign.Start)
    .justifyContent(FlexAlign.Start)
    .transition(TransitionEffect.OPACITY.animation({ duration: 600 }))
    .expandSafeArea([SafeAreaType.SYSTEM, SafeAreaType.CUTOUT], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM]);
  }

  @Builder
  buildHeader() {
    Column(){
      Row() {
        Text('首页')
          .fontSize($r('sys.float.Title_M'))
          .fontColor($r('app.color.font_color_level1'))
          .fontWeight(FontWeight.Bold)
      }
      .height($r('app.float.nav_header_height'))
      .width('100%')
    }
    .backgroundColor($r('app.color.background_color_primary'))
    .expandSafeArea()
    .padding({
      left: $r('app.float.space_l'),
      right: $r('app.float.space_l'),
    })
    .width('100%')
  }
  @Builder
  buildRefreshingContent() {
    Stack() {
      if (this.vm.refreshStatus === RefreshStatus.OverDrag) {
        Text('释放可刷新页面')
          .fontColor($r('sys.color.font_secondary'))
          .fontSize($r('sys.float.Body_M'))
          .lineHeight(32)
          .halfLeading(true);
      } else if (this.vm.refreshStatus === RefreshStatus.Drag) {
        Text('下拉刷新')
          .fontColor($r('sys.color.font_secondary'))
          .fontSize($r('sys.float.Body_M'))
          .lineHeight(32)
          .halfLeading(true);
      }
    }
    .align(Alignment.Center)
    .clip(true)
    .constraintSize({ minHeight: 32 })
    .width('100%')
    .backgroundColor($r('app.color.background_color_grey'))
  }
}


@Builder
export function buildHomePage() {
  HomePage();
}

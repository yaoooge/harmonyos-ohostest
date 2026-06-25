import { CategoryItem } from 'lib_network';
import { ProductWaterFlow } from './ProductWaterFlow';
import { UnavailableAction } from '../utils/UnavailableAction';

@ComponentV2
export struct HomePageContent {
  @Param
  categoryList: CategoryItem[] = [];
  @Param
  scroller: Scroller = new Scroller();
  @Event
  handleClickCategory: (id: string) => void;

  build() {
    Column({ space: 12 }) {
      Blank().height(0)
      this.buildCategory();
      ProductWaterFlow({
        testId: 'home-waterflow',
        openSwiper: true,
        handleProductClick: (_id) => {
          UnavailableAction.show();
        },
        handleBack: () => {
          this.scroller.scrollEdge(Edge.Top);
        },
      })
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
    }
    .padding({
      left: $r('app.float.space_l'),
      right: $r('app.float.space_l'),
    })
    .backgroundColor($r('app.color.background_color_grey'))
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
  }

  @Builder
  buildCategory() {
    Column({ space: 12 }) {
      Scroll() {
        Row({ space: 16 }) {
          ForEach(this.categoryList, (category: CategoryItem) => {
            Column() {
              Image(category.iconUrl)
                .width(48)
                .height(48)
                .margin({ bottom: 4 });
              Text(category.label)
                .fontSize(12)
                .fontColor($r('app.color.font_color_level3'));
            }
            .width(60)
            .onClick(() => {
              this.handleClickCategory?.(category.id)
            })
          }, (category: CategoryItem) => category.id)
        }
        .constraintSize({ minWidth: '100%' })
        .padding($r('app.float.space_l'))
        .justifyContent(FlexAlign.Start)
      }
      .scrollable(ScrollDirection.Horizontal)
      .scrollBar(BarState.Off)
      .edgeEffect(EdgeEffect.Spring)
    }
    .backgroundColor($r('app.color.background_color_primary'))
    .borderRadius($r('app.float.border_radius_l'))
    .id('home-category-section')
  }
}

import { CartProductInfo } from 'lib_network';
import { ShoppingCart } from '../components/ShoppingCart';
import { ProductWaterFlow } from '../components/ProductWaterFlow';
import { UnavailableAction } from '../utils/UnavailableAction';

@ComponentV2
struct CartPage {
  @Param
  public pageName?: string = undefined;
  @Local isChildRoute: boolean = false;

  aboutToAppear(): void {
    this.isChildRoute = Boolean(this.pageName);
  }

  build(): void {
    NavDestination() {
      ShoppingCart({
        isChildRoute: this.isChildRoute,
        isLogin: true,
        isMember: false,
        customContentBuilder: () => {
          this.recommendedProductSection();
        },
        onLogin: () => {
          UnavailableAction.show();
        },
        onCardClick: (_id: string, _slotId?: string) => {
          UnavailableAction.show();
        },
        onSpecRowClick: () => {
          UnavailableAction.show();
        },
        onBack: () => {
          UnavailableAction.show();
        },
        onCheckout: (_selectedGoodList: CartProductInfo[]) => {
          UnavailableAction.show();
        },
      })
    }
    .transition(TransitionEffect.OPACITY.animation({ duration: 600 }))
    .hideTitleBar(true)
    .backgroundColor($r('app.color.background_color_grey'))
  }

  @Builder
  recommendedProductSection() {
    buildSpecialDivider();
    Column() {
      ProductWaterFlow({
        testId: 'cart-recommend-waterflow',
        bgColor: $r('app.color.background_color_grey'),
        handleProductClick: (_id) => {
          UnavailableAction.show();
        },
      })
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
    }
    .padding({ left: 12, right: 12 })
    .backgroundColor($r('app.color.background_color_grey'))
    .id('cart-recommend-section')
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
  }
}

@Builder
export function buildCartPage(pageName?: string) {
  CartPage({ pageName: pageName })
}

@Builder
function buildSpecialDivider() {
  Row() {
    Column()
      .width(5.5)
      .height(5.5)
      .borderRadius(10)
      .linearGradient({
        angle: -130.6,
        colors: [['#FFE64566', 0.3], ['#00E64566', 1.0]],
      })
      .margin({ right: 10 })
    Column()
      .width(7)
      .height(7)
      .borderRadius(10)
      .linearGradient({
        angle: -130.6,
        colors: [['#FFE64566', 0.3], ['#00E64566', 1.0]],
      })
    Text('推荐商品')
      .fontSize(15)
      .fontColor($r('app.color.font_color_level1'))
      .margin({ left: 15, right: 15 })
    Column()
      .width(7)
      .height(7)
      .borderRadius(10)
      .linearGradient({
        angle: 130.6,
        colors: [['#FFE64566', 0.3], ['#00E64566', 1.0]],
      })
    Column()
      .width(5.5)
      .height(5.5)
      .borderRadius(10)
      .linearGradient({
        angle: 130.6,
        colors: [['#FFE64566', 0.3], ['#00E64566', 1.0]],
      })
      .margin({ left: 10 })
  }
  .width('100%')
  .height(47)
  .alignItems(VerticalAlign.Center)
  .justifyContent(FlexAlign.Center)
}

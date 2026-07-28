import { PriceType } from 'lib_network';
import { ProductModel } from '../commons/Model';
import { CartListView } from './CartListView';
import { CartPageHeader } from './CartPageHeader';
import { CartPageVM } from '../viewmodels/ShoppingCartVM';

@ComponentV2
export struct ShoppingCart {
  // 购物车页面是否是作为子路由页面
  @Param isChildRoute: boolean = false;
  // 是否登录
  @Param isLogin: boolean = false;
  // 是否是会员
  @Param isMember: boolean = false;
  // 自定义模块
  @BuilderParam customContentBuilder: CustomBuilder;
  // 登录事件回调
  @Event onLogin: () => void = () => {
  };
  // 结算事件回调
  @Event
  public onCheckout: (selectedGoodList: ProductModel[]) => void = () => {
  };
  // 作为子页面时，返回事件回调
  @Event onBack: () => void = () => {
  };
  // 商品卡片事件回调
  @Event onCardClick: (id: string, slotId?: string) => void = () => {
  };
  // 规格行点击事件回调
  @Event onSpecRowClick: (productId: string, skuCode: string, count: number, priceType: PriceType,
    slotId?: string) => void = () => {
  };
  // 购物车刷新触发键，外部递增此值触发购物车重新加载
  @Param cartRefreshKey: number = 0;
  vm: CartPageVM = new CartPageVM();

  @Monitor('cartRefreshKey')
  onCartRefreshKeyChange() {
    this.vm.cartVersion = '';
    this.vm.init();
  }

  aboutToAppear(): void {
    this.vm.isLogin = this.isLogin;
    this.vm.isMember = this.isMember;
  }

  // 监听登录状态
  @Monitor('isLogin')
  onLoginStatusChange() {
    this.vm.isLogin = this.isLogin;
  }

  build() {
    Column() {
      // 用户已登录
      if (this.vm.isLogin) {
        // 页面加载
        Column() {
          // 头部
          CartPageHeader({
            isChildRoute: this.isChildRoute,
            isEdit: this.vm.isEdit,
            showEdit: this.vm.cartCards.length > 0,
            changeEdit: () => {
              this.vm.isEdit = !this.vm.isEdit;
            },
            onBack: () => {
              this.onBack && this.onBack();
            },
          })
          Scroll() {
            Column() {
              Column() {
                // 购物车列表不为空
                if (this.vm.cartCards.length) {
                  CartListView({
                    listData: this.vm.cartCards,
                    isEdit: this.vm.isEdit,
                    onCardClick: (id: string, slotId?: string) => {
                      this.onCardClick && this.onCardClick(id, slotId);
                    },
                    onSpecClick: (productId: string, skuCode: string, count: number, priceType: PriceType,
                      slotId?: string) => {
                      this.onSpecRowClick && this.onSpecRowClick(productId, skuCode, count, priceType, slotId);
                    },
                    onChangeCount: (skuCode: string) => {
                      // 更新购物车商品的数量
                      this.vm.updateProductCount(skuCode);
                    },
                    onDelete: (skuCode: string) => {
                      this.vm.onDeleteProduct(skuCode);
                    },
                  })
                } else {
                  // 购物车列表为空
                  this.cartEmptyBuilder();
                }
              }
              .width('100%')
              .alignItems(HorizontalAlign.Center)
              .justifyContent(FlexAlign.Start)

              // 自定义模块，推荐商品
              if (this.customContentBuilder) {
                this.customContentBuilder();
              }
            }
            .width('100%')
            .constraintSize({ minHeight: '100%' })
            .alignItems(HorizontalAlign.Center)
            .justifyContent(FlexAlign.Start)
            .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
          }
          .layoutWeight(1)
          .scrollBar(BarState.Off)
          .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
        }
        .width('100%')
        .layoutWeight(1)
        .onClick(() => {
          // 用来清空步进器的焦点
          this.getUIContext().getFocusController().clearFocus();
        })
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
      }
    }
    .width('100%')
    .layoutWeight(1)
    .id('cart-page')
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
    .onVisibleAreaChange([0.0, 1.0], (isExpanding: boolean) => {
      if (this.vm.isLogin && isExpanding) {
        this.vm.init();
      }
    })
  }

  @Builder
  cartEmptyBuilder() {
    Column() {
      Column() {
        Image($r('app.media.empty_status_logo'))
          .width(200)
          .height(200)
          .borderRadius(100)
          .draggable(false)
          .objectFit(ImageFit.Cover)
          .margin({ bottom: $r('app.float.space_l'), top: $r('app.float.space_l') })
        Text('购物车空空如也，去逛逛吧~')
          .fontSize(12)
          .fontColor($r('app.color.font_color_level2'))
      }
      .backgroundColor($r('app.color.background_color_primary'))
      .borderRadius(16)
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .height('45%')
    .constraintSize({ minHeight: 200 })
    .padding(16)
    .alignItems(HorizontalAlign.Center)
    .justifyContent(FlexAlign.Center)
    .id('cart-empty-state')

  }
}

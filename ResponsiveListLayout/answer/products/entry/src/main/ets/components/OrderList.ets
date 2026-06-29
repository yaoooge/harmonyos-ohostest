import {
  SegmentButtonV2ItemOptions,
  SegmentButtonV2Items,
  TabSegmentButtonV2,
} from '@kit.ArkUI';
import { LIST_CARDS, ORDER_TABS } from '../model/DemoData';
import { ListCard, OrderTabItem } from '../model/Types';
import { BreakpointModel, BreakpointStorage, BreakpointSystem } from '../utils/BreakpointSystem';

@Extend(Text)
function orderSingleLineText() {
  .maxLines(1)
  .textOverflow({ overflow: TextOverflow.Ellipsis })
}

@Extend(Text)
function orderDoubleLineText() {
  .maxLines(2)
  .textOverflow({ overflow: TextOverflow.Ellipsis })
}

@Extend(Text)
function orderShopNameText() {
  .fontSize(16)
  .fontWeight(FontWeight.Bold)
  .fontColor('#111827')
}

@Extend(Text)
function orderMutedText(fontSize: number = 12) {
  .fontSize(fontSize)
  .fontColor('#8A9099')
}

@Extend(Text)
function orderStatusTitleText() {
  .fontSize(15)
  .fontWeight(FontWeight.Medium)
  .fontColor('#111827')
}

@Extend(Text)
function orderProductTitleText() {
  .fontSize(16)
  .fontWeight(FontWeight.Bold)
  .fontColor('#111827')
}

@Extend(Text)
function orderPriceText(fontSize: number = 18) {
  .fontSize(fontSize)
  .fontWeight(FontWeight.Bold)
  .fontColor('#111827')
}

@Extend(Image)
function orderShopIconStyle() {
  .width(28)
  .height(28)
  .objectFit(ImageFit.Contain)
  .borderRadius(14)
}

@Extend(Image)
function orderProductImageStyle() {
  .width(82)
  .height(82)
  .objectFit(ImageFit.Cover)
  .borderRadius(8)
  .backgroundColor('#F3F4F6')
  .draggable(false)
}

@Extend(Column)
function orderCardSurfaceStyle() {
  .width('100%')
  .padding(16)
  .borderRadius(16)
  .backgroundColor(Color.White)
}

@Extend(Row)
function orderStatusPanelStyle() {
  .width('100%')
  .padding({ left: 12, right: 12, top: 10, bottom: 10 })
  .borderRadius(8)
  .backgroundColor('#F5F6F8')
  .margin({ top: 16 })
}

@Extend(Button)
function orderActionButtonStyle(isPrimary: boolean) {
  .fontSize(14)
  .fontWeight(isPrimary ? FontWeight.Bold : FontWeight.Medium)
  .fontColor(isPrimary ? Color.White : '#111827')
  .height(36)
  .padding({ left: 18, right: 18 })
  .margin({ left: 10, top: 12 })
  .backgroundColor(isPrimary ? '#C51636' : '#F2F3F5')
}

@ComponentV2
export struct OrderList {
  @Local
  currentBreakpoint: BreakpointStorage = BreakpointSystem.currentBreakpoint;
  @Local
  activeStatus: string = 'all';
  @Local
  selectedStatusIndex: number = 0;
  private readonly statusSegmentItems: SegmentButtonV2Items = new SegmentButtonV2Items(
    ORDER_TABS.map((tab: OrderTabItem) => {
      const item: SegmentButtonV2ItemOptions = {
        text: tab.label,
        accessibilityText: tab.label,
      };
      return item;
    }),
  );

  @Computed
  get lanes(): number {
    return new BreakpointModel<number>(1, 1, 2).getValue(this.currentBreakpoint.value);
  }

  @Computed
  get space(): number {
    return new BreakpointModel<number>(8, 12, 16).getValue(this.currentBreakpoint.value);
  }

  @Computed
  get filteredOrders(): ListCard[] {
    if (this.activeStatus === 'all') {
      return LIST_CARDS;
    }
    return LIST_CARDS.filter((item: ListCard) => item.statusKey === this.activeStatus);
  }

  build() {
    Column() {
      this.statusTabs()
      List({ space: this.space }) {
        ForEach(this.filteredOrders, (item: ListCard, index: number) => {
          ListItem() {
            this.orderCard(item)
          }
          .id('order-list-item' + index)
        }, (item: ListCard) => item.orderNo)
      }
      .lanes(this.lanes, 12)
      .width('100%')
      .layoutWeight(1)
      .padding({ left: 16, right: 16, bottom: 16 })
      .scrollBar(BarState.Off)
      .id('order-list')
    }
    .width('100%')
    .layoutWeight(1)
  }

  @Builder
  statusTabs() {
    TabSegmentButtonV2({
      items: this.statusSegmentItems,
      selectedIndex: this.selectedStatusIndex,
      $selectedIndex: (selectedIndex: number) => {
        this.updateSelectedStatus(selectedIndex);
      },
      onItemClicked: (selectedIndex: number) => {
        this.updateSelectedStatus(selectedIndex);
      },
    })
    .margin({ left: 16, right: 16, bottom: 14 })
    .id('order-status-tabs')
  }

  @Builder
  orderCard(item: ListCard) {
    Column() {
      Row() {
        Row({ space: 8 }) {
          Image(item.shopIcon)
            .orderShopIconStyle()
          Column() {
            Text(item.shopName)
              .orderShopNameText()
              .orderSingleLineText()
            Text('订单编号：' + item.orderNo)
              .orderMutedText()
              .margin({ top: 3 })
              .orderSingleLineText()
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Start)
        }
        .layoutWeight(1)

        Text(item.status)
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor(item.statusKey === 'pendingPayment' ? '#C51636' : '#4B5563')
          .margin({ left: 8 })
      }
      .width('100%')
      .alignItems(VerticalAlign.Top)

      if (item.orderTime || item.statusDesc) {
        Row() {
          Text(item.status)
            .orderStatusTitleText()
          Text(item.orderTime)
            .orderMutedText()
            .margin({ left: 8 })
            .layoutWeight(1)
            .orderSingleLineText()
          Text(item.statusDesc)
            .orderMutedText()
            .orderSingleLineText()
        }
        .orderStatusPanelStyle()
      }

      Row() {
        Image(item.image)
          .orderProductImageStyle()

        Column() {
          Text(item.title)
            .orderProductTitleText()
            .orderDoubleLineText()
          if (item.spec) {
            Text(item.spec)
              .orderMutedText()
              .margin({ top: 6 })
              .orderSingleLineText()
          }
          Row() {
            Text(item.price)
              .orderPriceText(19)
            Text('x' + item.count.toString())
              .orderMutedText(13)
          }
          .width('100%')
          .justifyContent(FlexAlign.SpaceBetween)
          .margin({ top: 12 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)
        .margin({ left: 14 })
      }
      .width('100%')
      .alignItems(VerticalAlign.Top)
      .margin({ top: 18 })

      Divider()
        .strokeWidth(1)
        .color('#F0F1F3')
        .margin({ top: 16, bottom: 12 })

      Row() {
        Text(item.totalText)
          .fontSize(14)
          .fontColor('#6B7280')
        Text(item.payPrice)
          .orderPriceText()
      }
      .width('100%')
      .justifyContent(FlexAlign.End)
      .alignItems(VerticalAlign.Center)

      Flex({ justifyContent: FlexAlign.End, wrap: FlexWrap.Wrap }) {
        ForEach(item.actions, (action: string) => {
          Button(action, { type: ButtonType.Capsule, stateEffect: true })
            .orderActionButtonStyle(this.isPrimaryAction(action))
            .onClick(() => {
              this.showActionToast(action, item.orderNo);
            })
        }, (action: string) => item.orderNo + action)
      }
      .width('100%')
    }
    .orderCardSurfaceStyle()
  }

  private showActionToast(action: string, orderNo: string): void {
    try {
      this.getUIContext().getPromptAction().showToast({
        message: action + '：' + orderNo,
        duration: 1800,
      });
    } catch (error) {
      console.error('show order action toast failed: ' + JSON.stringify(error));
    }
  }

  private updateSelectedStatus(selectedIndex: number): void {
    if (selectedIndex < 0 || selectedIndex >= ORDER_TABS.length) {
      return;
    }
    this.selectedStatusIndex = selectedIndex;
    this.activeStatus = ORDER_TABS[selectedIndex].value;
  }

  private isPrimaryAction(action: string): boolean {
    return action === '去支付' || action === '确认收货';
  }
}

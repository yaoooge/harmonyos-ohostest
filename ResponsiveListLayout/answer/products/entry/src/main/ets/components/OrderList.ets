import { LIST_CARDS } from '../model/DemoData';
import { ListCard } from '../model/Types';
import { BreakpointModel, BreakpointStorage, BreakpointSystem } from '../utils/BreakpointSystem';

@ComponentV2
export struct OrderList {
  @Local
  currentBreakpoint: BreakpointStorage = BreakpointSystem.currentBreakpoint;

  @Computed
  get lanes(): number {
    return new BreakpointModel<number>(1, 2, 3).getValue(this.currentBreakpoint.value);
  }

  @Computed
  get space(): number {
    return new BreakpointModel<number>(8, 12, 16).getValue(this.currentBreakpoint.value);
  }

  build() {
    List({ space: this.space }) {
      ForEach(LIST_CARDS, (item: ListCard, index: number) => {
        ListItem() {
          Row() {
            Column()
              .width(68)
              .height(68)
              .borderRadius(8)
              .backgroundColor(item.color)
            Column() {
              Text(item.title)
                .fontSize(16)
                .fontWeight(FontWeight.Medium)
                .fontColor('#1D252F')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
              Text(item.desc)
                .fontSize(12)
                .fontColor('#5F6B7A')
                .margin({ top: 6 })
                .maxLines(2)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
              Row() {
                Text(item.meta)
                  .fontSize(12)
                  .fontColor('#697386')
                Text(item.price)
                  .fontSize(15)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#B3261E')
              }
              .width('100%')
              .justifyContent(FlexAlign.SpaceBetween)
              .margin({ top: 10 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start)
            .margin({ left: 12 })
          }
          .width('100%')
          .padding(12)
          .borderRadius(8)
          .backgroundColor(Color.White)
        }
        .id('order-list-item' + index)
      }, (item: ListCard) => item.title)
    }
    .lanes(this.lanes, 12)
    .width('100%')
    .layoutWeight(1)
    .padding({ left: 16, right: 16, bottom: 16 })
    .scrollBar(BarState.Off)
    .id('order-list')
  }
}

import { PRODUCT_CARDS } from '../model/DemoData';
import { ProductCard } from '../model/Types';

@ComponentV2
export struct ProductWaterFlow {
  build() {
    WaterFlow({ layoutMode: WaterFlowLayoutMode.SLIDING_WINDOW }) {
      ForEach(PRODUCT_CARDS, (item: ProductCard, index: number) => {
        FlowItem() {
          Column() {
            Column()
              .width('100%')
              .aspectRatio(item.ratio)
              .borderRadius(8)
              .backgroundColor(item.color)
            Text(item.title)
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor('#1D252F')
              .margin({ top: 8 })
              .maxLines(2)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
            Row() {
              Text(item.price)
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor('#B3261E')
              Text(item.tag)
                .fontSize(11)
                .fontColor('#3F5F47')
                .backgroundColor('#E8F3E7')
                .borderRadius(4)
                .padding({ left: 6, right: 6, top: 2, bottom: 2 })
            }
            .width('100%')
            .justifyContent(FlexAlign.SpaceBetween)
            .alignItems(VerticalAlign.Center)
            .margin({ top: 8 })
          }
          .alignItems(HorizontalAlign.Start)
          .padding(10)
          .borderRadius(8)
          .backgroundColor(Color.White)
          .id('product-waterflow-item' + index)
        }
      }, (item: ProductCard) => item.title)
    }
    .columnsTemplate('repeat(2, 1fr)')
    .columnsGap(8)
    .rowsGap(8)
    .width('100%')
    .layoutWeight(1)
    .padding({ left: 16, right: 16, bottom: 16 })
    .scrollBar(BarState.Off)
    .id('product-waterflow')
  }
}

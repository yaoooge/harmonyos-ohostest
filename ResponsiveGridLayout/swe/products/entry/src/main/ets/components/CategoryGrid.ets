import { GRID_CARDS } from '../model/DemoData';
import { GridCard } from '../model/Types';

@ComponentV2
export struct CategoryGrid {
  build() {
    Grid() {
      ForEach(GRID_CARDS, (item: GridCard, index: number) => {
        GridItem() {
          Column() {
            Column()
              .width('100%')
              .aspectRatio(1)
              .borderRadius(8)
              .backgroundColor(item.color)
            Text(item.title)
              .fontSize(15)
              .fontWeight(FontWeight.Medium)
              .fontColor('#1D252F')
              .margin({ top: 8 })
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
            Text(item.desc)
              .fontSize(12)
              .fontColor('#697386')
              .margin({ top: 4 })
          }
          .alignItems(HorizontalAlign.Start)
          .padding(10)
          .borderRadius(8)
          .backgroundColor(Color.White)
        }
        .id('category-grid-item' + index)
      }, (item: GridCard) => item.title)
    }
    .columnsTemplate('repeat(2, 1fr)')
    .columnsGap(8)
    .rowsGap(8)
    .width('100%')
    .layoutWeight(1)
    .padding({ left: 16, right: 16, bottom: 16 })
    .scrollBar(BarState.Off)
    .id('category-grid')
  }
}

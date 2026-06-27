import { GRID_CARDS } from '../model/DemoData';
import { GridCard } from '../model/Types';
import { BreakpointModel, BreakpointStorage, BreakpointSystem } from '../utils/BreakpointSystem';

@ComponentV2
export struct AdaptiveGrid {
  @Local
  currentBreakpoint: BreakpointStorage = BreakpointSystem.currentBreakpoint;

  @Computed
  get columns(): number {
    return 2;
  }

  @Computed
  get gap(): number {
    return new BreakpointModel<number>(8, 12, 12).getValue(this.currentBreakpoint.value);
  }

  build() {
    Grid() {
      ForEach(GRID_CARDS, (item: GridCard) => {
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
        .id('adaptive-grid-item')
      }, (item: GridCard) => item.title)
    }
    .columnsTemplate(`repeat(${this.columns}, 1fr)`)
    .columnsGap(this.gap)
    .rowsGap(this.gap)
    .width('100%')
    .layoutWeight(1)
    .padding({ left: 16, right: 16, bottom: 16 })
    .scrollBar(BarState.Off)
    .id('adaptive-grid')
  }
}

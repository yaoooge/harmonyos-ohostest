@ComponentV2
export struct PageHeader {
  @Param title: string = '';
  @Param subtitle: string = '';
  @Param testId: string = 'page-header';

  build() {
    Column() {
      Text(this.title)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor('#18202A')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
      Text(this.subtitle)
        .fontSize(13)
        .fontColor('#5F6B7A')
        .margin({ top: 6 })
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .alignItems(HorizontalAlign.Start)
    .width('100%')
    .padding({ left: 16, right: 16, top: 18, bottom: 14 })
    .id(this.testId)
  }
}

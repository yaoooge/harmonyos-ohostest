import { PageHeader } from '../components/PageHeader';
import { CategoryGrid } from '../components/CategoryGrid';

@Entry
@ComponentV2
struct Index {
  build() {
    Column() {
      PageHeader({
        title: '分类宫格',
        subtitle: '常用分类入口',
        testId: 'grid-header',
      })
      CategoryGrid()
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F4F6F8')
    .id('grid-page')
  }
}

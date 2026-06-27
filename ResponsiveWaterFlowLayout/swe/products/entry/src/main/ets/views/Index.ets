import { PageHeader } from '../components/PageHeader';
import { ProductWaterFlow } from '../components/ProductWaterFlow';

@Entry
@ComponentV2
struct Index {
  build() {
    Column() {
      PageHeader({
        title: '瀑布流推荐',
        subtitle: '精选商品按卡片流展示',
        testId: 'waterflow-header',
      })
      ProductWaterFlow()
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F4F6F8')
    .id('waterflow-page')
  }
}

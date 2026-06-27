import { PageHeader } from '../components/PageHeader';
import { OrderList } from '../components/OrderList';

@Entry
@ComponentV2
struct Index {
  build() {
    Column() {
      PageHeader({
        title: '订单列表',
        subtitle: '近期订单和配送状态',
        testId: 'list-header',
      })
      OrderList()
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F4F6F8')
    .id('list-page')
  }
}

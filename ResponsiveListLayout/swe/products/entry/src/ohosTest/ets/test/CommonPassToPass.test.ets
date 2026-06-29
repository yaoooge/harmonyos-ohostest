import { describe, beforeAll, it, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertComponentById,
  assertComponentByText,
  assertNoHorizontalOverflow,
  getDriver,
  prepareEntryAbility,
} from './TestHelper';

export default function commonPassToPassTest() {
  describe('CommonPassToPassTest', () => {
    let driver: Driver;

    beforeAll(async () => {
      driver = getDriver();
      await prepareEntryAbility();
    });

    it('should_start_ability_successfully', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'list-page');
      done();
    });

    it('should_show_list_page_content', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'list-header');
      await assertComponentByText(driver, '订单中心');
      done();
    });

    it('should_show_list_items', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'order-list');
      await assertComponentById(driver, 'order-list-item0');
      done();
    });

    it('should_keep_list_items_without_horizontal_overflow', Level.LEVEL2, async (done: Function) => {
      await assertNoHorizontalOverflow(driver, 'order-list', 'order-list-item0');
      done();
    });
  });
}

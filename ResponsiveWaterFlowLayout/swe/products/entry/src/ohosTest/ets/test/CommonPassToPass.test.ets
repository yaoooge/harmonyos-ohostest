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
      await assertComponentById(driver, 'waterflow-page');
      done();
    });

    it('should_show_waterflow_page_content', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'waterflow-header');
      await assertComponentByText(driver, '瀑布流推荐');
      done();
    });

    it('should_show_waterflow_items', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'product-waterflow');
      await assertComponentById(driver, 'product-waterflow-item0');
      done();
    });

    it('should_keep_waterflow_items_without_horizontal_overflow', Level.LEVEL2, async (done: Function) => {
      await assertNoHorizontalOverflow(driver, 'product-waterflow', 'product-waterflow-item0');
      done();
    });
  });
}

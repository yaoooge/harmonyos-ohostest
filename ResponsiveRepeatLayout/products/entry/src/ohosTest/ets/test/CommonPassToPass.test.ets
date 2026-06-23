import { describe, beforeAll, it, expect, Level } from '@ohos/hypium';
import { Driver } from '@kit.TestKit';
import {
  assertComponentById,
  assertComponentByText,
  assertNoHorizontalOverflow,
  clickTabByIndex,
  componentExistsById,
  getDriver,
  prepareEntryAbility,
  waitForComponentById,
} from './TestHelper';

export default function commonPassToPassTest() {
  describe('CommonPassToPassTest', () => {
    let driver: Driver;

    beforeAll(async () => {
      driver = getDriver();
      await prepareEntryAbility();
    });

    it('should_start_ability_successfully', Level.LEVEL2, async (done: Function) => {
      await assertComponentById(driver, 'main-tabs');
      done();
    });

    it('should_show_home_tab_content_after_app_launch', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 0);
      await assertComponentByText(driver, '首页');
      await assertComponentByText(driver, '分类');
      await assertComponentByText(driver, '购物车');
      await assertComponentByText(driver, '我的');
      done();
    });

    it('should_show_search_bar_on_home_page', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 0);
      await assertComponentById(driver, 'search');
      done();
    });

    it('should_show_home_waterflow_product_items', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 0);
      await assertComponentById(driver, 'home-waterflow');
      await assertComponentById(driver, 'home-waterflow-item');
      done();
    });

    it('should_keep_home_waterflow_items_visible_without_horizontal_overflow', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 0);
      await waitForComponentById(driver, 'home-waterflow', 10);
      await assertNoHorizontalOverflow(driver, 'home-waterflow', 'home-waterflow-item');
      done();
    });

    it('should_switch_to_category_tab_and_show_category_content', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 1);
      await waitForComponentById(driver, 'category-left-list', 10);
      await assertComponentByText(driver, '分类');
      await assertComponentById(driver, 'category-left-list');
      done();
    });

    it('should_show_category_side_list_and_product_area', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 1);
      await waitForComponentById(driver, 'category-product-grid', 10);
      await assertComponentById(driver, 'category-left-list');
      await assertComponentById(driver, 'category-product-grid');
      done();
    });

    it('should_switch_to_cart_tab_and_show_cart_content', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 2);
      await waitForComponentById(driver, 'cart-page', 10);
      await assertComponentByText(driver, '购物车');
      await assertComponentById(driver, 'cart-page');
      done();
    });

    it('should_show_cart_product_list_or_empty_state', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 2);
      await waitForComponentById(driver, 'cart-page', 10);
      const hasList = await componentExistsById(driver, 'cart-list');
      const hasEmpty = await componentExistsById(driver, 'cart-empty-state');
      expect(hasList || hasEmpty).assertTrue();
      done();
    });

    it('should_show_cart_control_panel_when_cart_list_exists', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 2);
      await waitForComponentById(driver, 'cart-page', 10);
      if (await componentExistsById(driver, 'cart-list')) {
        await assertComponentById(driver, 'cart-control-panel');
      } else {
        expect(true).assertTrue();
      }
      done();
    });

    it('should_switch_to_profile_tab_and_show_profile_content', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 3);
      await waitForComponentById(driver, 'profile-page', 10);
      await assertComponentByText(driver, '我的');
      await assertComponentById(driver, 'profile-page');
      done();
    });

    it('should_show_profile_order_and_menu_sections', Level.LEVEL2, async (done: Function) => {
      await clickTabByIndex(driver, 3);
      await waitForComponentById(driver, 'profile-page', 10);
      await assertComponentByText(driver, '我的订单');
      await assertComponentByText(driver, '地址管理');
      done();
    });
  });
}

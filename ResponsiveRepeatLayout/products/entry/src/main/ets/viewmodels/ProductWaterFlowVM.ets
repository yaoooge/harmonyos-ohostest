import { util } from '@kit.ArkTS';
import { motion } from '@kit.MultimodalAwarenessKit';
import { MotionUtil, WindowUtil } from 'lib_foundation';
import { FilterSelectionItem, ProductApis, ProductCardItem } from 'lib_network';
import { SortTypeMap } from '../commons/Enums';

@ObservedV2
export class ProductWaterFlowVM {
  @Trace
  categoryId: string = '';
  @Trace
  keyword: string = '';
  @Trace
  slotId: string = '';
  @Trace
  sortType: SortTypeMap = SortTypeMap.DEFAULT;
  @Trace
  filterList: FilterSelectionItem[] = [];
  @Trace
  dataList: ProductCardItem[] = [];
  @Trace
  reachEnd: boolean = false;
  @Trace
  isLoading: boolean = false;
  @Trace
  isGrid: boolean = false;
  @Trace
  scrollHeight: number = 0;
  @Trace
  startBack: boolean = false;
  @Trace
  curPage: number = 1;
  @Trace
  showSheet: boolean = false;
  @Trace
  testId: string = util.generateRandomUUID(false);
  scroller: Scroller = new Scroller();

  @Computed
  get edgeEffect() {
    if (typeof this.scroller.isAtEnd() === 'undefined') {
      return EdgeEffect.Spring;
    }
    return this.reachEnd || this.scroller.isAtEnd() ? EdgeEffect.Spring : EdgeEffect.None;
  }

  @Computed
  get showButton() {
    return this.scrollHeight > 400;
  }

  @Computed
  get backButtonPosition(): Edges {
    if (canIUse('SystemCapability.MultimodalAwareness.Motion') &&
      MotionUtil.holdingHand === motion.HoldingHandStatus.LEFT_HAND_HELD) {
      return {
        left: 16,
        bottom: 56,
      };
    }
    return {
      right: 16,
      bottom: 56,
    };
  }

  @Computed
  get columnTemplate() {
    if (this.isGrid) {
      return '1fr';
    }
    return '1fr 1fr';
  }

  async refreshList() {
    this.curPage = 1;
    this.reachEnd = false;
    this.dataList = [];
    await this.getDataList();
  }

  async getDataList() {
    if (this.reachEnd || this.isLoading) {
      return;
    }
    this.isLoading = true;
    const res = await ProductApis.getProductList({
      curPage: this.curPage,
      categoryId: this.categoryId,
      keyword: this.keyword,
      sortType: this.sortType,
      filterList: this.filterList,
      slotId: this.slotId,
    });
    if (res.code === 0) {
      this.reachEnd = res.isFinal;
      this.dataList.push(...res.list);
      if (this.columnTemplate.split(' ').length >= 4 &&
      this.dataList.length &&
        this.dataList.length < 10 &&
        !this.reachEnd) {
        this.dataList.push(...res.list);
      }
      this.curPage++;
    }
    this.isLoading = false;
  }

  async jumpToSwiperPage(_snapShotComponentId: string): Promise<void> {
    WindowUtil.toast('功能暂未开放');
  }

  async handleBackToTop() {
    this.startBack = true;
    this.scroller.scrollTo({
      xOffset: 0,
      yOffset: 0,
      animation: {
        curve: Curve.Linear,
        duration: 500,
      },
    });
  }
}

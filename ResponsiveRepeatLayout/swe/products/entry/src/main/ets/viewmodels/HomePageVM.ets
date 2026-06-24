import {
  LoadingStatus,
  GlobalStateMgr,
  iData,
} from 'lib_foundation';
import { CategoryItem } from 'lib_network';
import { PreloadUtil } from '../utils/PreloadUtil';
import { UnavailableAction } from '../utils/UnavailableAction';

@ObservedV2
export class HomePageVM {
  public readonly global: GlobalStateMgr = iData.global;
  @Trace
  public loadingStatus: LoadingStatus = LoadingStatus.LOADING;
  @Trace
  public refreshStatus: RefreshStatus = RefreshStatus.Inactive;
  @Trace
  public isRefreshing: boolean = false;
  @Trace
  bannerList: string[] = [];
  @Trace
  categoryList: CategoryItem[] = [];
  @Trace
  searchList: string[] = [];
  @Trace
  currentSearchStr: string = '';

  public onRefreshStateChange(state: RefreshStatus): void {
    this.refreshStatus = state;
    if (state === RefreshStatus.Refresh) {
      this.loadHomePage();
    }
  }

  public async loadHomePage(): Promise<void> {
    this.loadingStatus = LoadingStatus.LOADING;
    try {
      const res = await PreloadUtil.getPreloadData();
      if (res?.code === 0) {
        this.categoryList = res.categoryList;
        this.searchList = res.searchList;
        this.bannerList = res.bannerList;
        this.currentSearchStr = res.searchList[0];
      }
      this.loadingStatus = LoadingStatus.SUCCESS;
    } catch (e) {
      this.loadingStatus = LoadingStatus.FAIL;
    }
    this.isRefreshing = false;
  }

  public jumpToCategoryPage(_id: string): void {
    UnavailableAction.show();
  }

  public jumpToScanPage(): void {
    UnavailableAction.show();
  }

  public jumpToSearchPage(_uiContext: UIContext, _snapShotComponentId: string): void {
    UnavailableAction.show();
  }
}

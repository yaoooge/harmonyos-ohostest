import {
  GlobalStateMgr,
  iData,
} from 'lib_foundation';
import { CategoryItem, HomeApis } from 'lib_network';
import { UnavailableAction } from '../utils/UnavailableAction';

@ObservedV2
export class HomePageVM {
  public readonly global: GlobalStateMgr = iData.global;
  @Trace
  public refreshStatus: RefreshStatus = RefreshStatus.Inactive;
  @Trace
  public isRefreshing: boolean = false;
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
    try {
      const res = await HomeApis.getHomeConfig();
      if (res?.code === 0) {
        this.categoryList = res.categoryList;
        this.searchList = res.searchList;
        this.currentSearchStr = res.searchList[0];
      }
    } catch (e) {
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

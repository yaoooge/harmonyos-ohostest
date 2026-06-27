import { AppStorageV2, window } from '@kit.ArkUI';

export enum BreakpointTypeEnum {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
}

export class BreakpointModel<T> {
  private sm: T;
  private md: T;
  private lg: T;

  constructor(sm: T, md: T, lg: T) {
    this.sm = sm;
    this.md = md;
    this.lg = lg;
  }

  getValue(currentBreakpoint: BreakpointTypeEnum): T {
    if (currentBreakpoint === BreakpointTypeEnum.SM) {
      return this.sm;
    }
    if (currentBreakpoint === BreakpointTypeEnum.MD) {
      return this.md;
    }
    return this.lg;
  }
}

@ObservedV2
export class BreakpointStorage {
  @Trace
  value: BreakpointTypeEnum = BreakpointTypeEnum.SM;
}

@ObservedV2
class BreakpointSystem {
  @Trace
  public currentBreakpoint: BreakpointStorage = AppStorageV2.connect(
    BreakpointStorage,
    () => new BreakpointStorage(),
  )!;
  private uiContext: UIContext | undefined;
  private windowClass: window.Window | undefined;

  public register(uiContext: UIContext): void {
    this.uiContext = uiContext;
    this.updateBreakpoint();
    window.getLastWindow(uiContext.getHostContext())
      .then((win: window.Window) => {
        this.windowClass = win;
        this.windowClass.on('windowSizeChange', () => {
          this.updateBreakpoint();
        });
      })
      .catch(() => {
      });
  }

  public unregister(): void {
    if (this.windowClass) {
      this.windowClass.off('windowSizeChange');
    }
  }

  public updateBreakpoint(): void {
    if (!this.uiContext) {
      return;
    }
    const current = this.uiContext.getWindowWidthBreakpoint();
    if (current === WidthBreakpoint.WIDTH_XS || current === WidthBreakpoint.WIDTH_SM) {
      this.currentBreakpoint.value = BreakpointTypeEnum.SM;
    } else if (current === WidthBreakpoint.WIDTH_MD) {
      this.currentBreakpoint.value = BreakpointTypeEnum.MD;
    } else {
      this.currentBreakpoint.value = BreakpointTypeEnum.LG;
    }
  }
}

const breakpointSystem = new BreakpointSystem();

export { breakpointSystem as BreakpointSystem };

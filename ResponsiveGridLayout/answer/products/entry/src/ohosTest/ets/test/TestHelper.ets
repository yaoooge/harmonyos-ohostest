import { Want } from '@kit.AbilityKit';
import { abilityDelegatorRegistry, Driver, ON, UiWindow } from '@kit.TestKit';
import { expect } from '@ohos/hypium';

export const delegator: abilityDelegatorRegistry.AbilityDelegator = abilityDelegatorRegistry.getAbilityDelegator();

const BREAKPOINT_SM = 600;
const BREAKPOINT_MD = 840;
const ROOT_ID = 'grid-page';

export type TestBreakpoint = 'sm' | 'md' | 'lg';

let sharedDriver: Driver | undefined = undefined;
let sharedBundleName: string = '';
let hasStartedEntryAbility: boolean = false;

export function getDriver(): Driver {
  if (sharedDriver === undefined) {
    sharedDriver = Driver.create();
  }
  return sharedDriver;
}

export async function prepareEntryAbility(): Promise<string> {
  const driver = getDriver();
  if (!hasStartedEntryAbility) {
    sharedBundleName = await startEntryAbility(driver);
    hasStartedEntryAbility = true;
  }
  return sharedBundleName;
}

async function startEntryAbility(driver: Driver): Promise<string> {
  const bundleName = abilityDelegatorRegistry.getArguments().bundleName;
  const want: Want = {
    bundleName: bundleName,
    abilityName: 'EntryAbility',
  };
  await delegator.startAbility(want);
  await waitForComponentById(driver, ROOT_ID, 10);
  return bundleName;
}

export async function getWindowVpWidth(driver: Driver, bundleName: string): Promise<number> {
  try {
    const uiWindow: UiWindow = await driver.findWindow({ bundleName: bundleName, active: true });
    const bounds = await uiWindow.getBounds();
    return px2vp(bounds.right - bounds.left);
  } catch (e) {
    console.error('getWindowVpWidth failed: ' + JSON.stringify(e));
    return -1;
  }
}

export function getBreakpointName(vpWidth: number): TestBreakpoint {
  if (vpWidth < BREAKPOINT_SM) {
    return 'sm';
  }
  if (vpWidth < BREAKPOINT_MD) {
    return 'md';
  }
  return 'lg';
}

export async function getCurrentBreakpoint(driver: Driver, bundleName: string): Promise<TestBreakpoint> {
  return getBreakpointName(await getWindowVpWidth(driver, bundleName));
}

export async function assertComponentById(driver: Driver, id: string): Promise<void> {
  await waitForComponentById(driver, id);
}

export async function assertComponentByText(driver: Driver, text: string): Promise<void> {
  await waitForComponentByText(driver, text);
}

export async function componentExistsById(driver: Driver, id: string): Promise<boolean> {
  try {
    const component = await driver.findComponent(ON.id(id));
    return component !== null && component !== undefined;
  } catch (e) {
    return false;
  }
}

export async function waitForComponentById(driver: Driver, id: string, retries: number = 8): Promise<void> {
  for (let index = 0; index < retries; index++) {
    if (await componentExistsById(driver, id)) {
      expect(true).assertTrue();
      return;
    }
    await driver.waitForIdle(200, 500);
  }
  expect(false).assertTrue();
}

export async function waitForComponentByText(driver: Driver, text: string, retries: number = 8): Promise<void> {
  for (let index = 0; index < retries; index++) {
    try {
      const component = await driver.findComponent(ON.text(text));
      if (component !== null && component !== undefined) {
        expect(true).assertTrue();
        return;
      }
    } catch (e) {
    }
    await driver.waitForIdle(200, 500);
  }
  expect(false).assertTrue();
}

export async function estimateLanesById(driver: Driver, containerId: string, itemId: string): Promise<number> {
  try {
    const container = await driver.findComponent(ON.id(containerId));
    const items = await driver.findComponents(ON.id(itemId));
    if (container === null || container === undefined || items === null || items === undefined || items.length === 0) {
      return -1;
    }
    const containerBounds = await container.getBounds();
    const itemBounds = await items[0].getBounds();
    const containerWidth = containerBounds.right - containerBounds.left;
    const itemWidth = itemBounds.right - itemBounds.left;
    if (itemWidth <= 0) {
      return -1;
    }
    return Math.round(containerWidth / itemWidth);
  } catch (e) {
    console.error('estimateLanesById failed: ' + JSON.stringify(e));
    return -1;
  }
}

export async function assertNoHorizontalOverflow(driver: Driver, containerId: string, itemId: string): Promise<void> {
  const container = await driver.findComponent(ON.id(containerId));
  const items = await driver.findComponents(ON.id(itemId));
  expect(container !== null && container !== undefined).assertTrue();
  expect(items !== null && items !== undefined && items.length > 0).assertTrue();
  const containerBounds = await container.getBounds();
  for (let index = 0; index < items.length; index++) {
    const itemBounds = await items[index].getBounds();
    expect(itemBounds.left >= containerBounds.left - 1).assertTrue();
    expect(itemBounds.right <= containerBounds.right + 1).assertTrue();
  }
}

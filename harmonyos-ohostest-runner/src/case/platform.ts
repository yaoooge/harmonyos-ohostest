import type { CasePlatform } from "./types/index.js";

export function readPlatformSettings(raw: { platform?: unknown }): {
  platform?: CasePlatform;
} {
  if (
    raw.platform !== undefined &&
    raw.platform !== "native" &&
    raw.platform !== "web" &&
    raw.platform !== "rn"
  ) {
    throw new Error(`case_platform_unsupported: ${String(raw.platform)}`);
  }
  return raw.platform === undefined ? {} : { platform: raw.platform };
}

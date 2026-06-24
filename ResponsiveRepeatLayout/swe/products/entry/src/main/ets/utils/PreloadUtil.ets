import { HomeApis, HomeConfigResp } from 'lib_network';

export class PreloadUtil {
  public static async getPreloadData(): Promise<HomeConfigResp | undefined> {
    return HomeApis.getHomeConfig();
  }
}

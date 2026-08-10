import { AxiosRequestConfig, HttpStatusCode } from '@ohos/axios';
import AxiosMockAdapter from '@hw-agconnect/axios-mock-adapter';
import { RequestUrlMap } from '../../constants/RequestUrlMap';
import { ProductCardItem } from '../../types/ProductTypes';
import { ProductListReq } from '../../types/RequestTypes';
import { ProductListResp } from '../../types/responses/ProductResponse';
import { MockProductData } from '../mockdata/MockProductData';

export class ProductMockApis {
  private readonly PAGE_SIZE: number = 8;

  public start(adapter: AxiosMockAdapter): void {
    adapter.onGet(RequestUrlMap.PRODUCT_LIST).reply((config: AxiosRequestConfig) => {
      const params = config.params as ProductListReq;
      let products: ProductCardItem[] = MockProductData.PRODUCT_CARD_LIST.slice();
      if (params.categoryId) {
        products = products.filter((item: ProductCardItem) => item.categoryId === params.categoryId);
      }
      if (params.keyword) {
        products = products.filter((item: ProductCardItem) => item.title.includes(params.keyword!));
      }
      if (params.sortType === 1) {
        products.sort((left: ProductCardItem, right: ProductCardItem) => left.price - right.price);
      } else if (params.sortType === 2) {
        products.sort((left: ProductCardItem, right: ProductCardItem) => right.price - left.price);
      }
      const curPage: number = params.curPage || 1;
      const start: number = (curPage - 1) * this.PAGE_SIZE;
      const list: ProductCardItem[] = products.slice(start, start + this.PAGE_SIZE);
      const response: ProductListResp = {
        code: 0,
        msg: 'success',
        list,
        curPage,
        isFinal: start + list.length >= products.length,
        total: products.length,
      };
      return [HttpStatusCode.Ok, response];
    });
  }
}

import { RequestUrlMap } from '../../constants/RequestUrlMap';
import { ProductListReq } from '../../types/RequestTypes';
import { ProductListResp } from '../../types/responses/ProductResponse';
import request from '../Request';

class ProductApis {
  public getProductList(params: ProductListReq): Promise<ProductListResp> {
    return request.get(RequestUrlMap.PRODUCT_LIST, { params });
  }
}

const instance = new ProductApis();

export { instance as ProductApis };

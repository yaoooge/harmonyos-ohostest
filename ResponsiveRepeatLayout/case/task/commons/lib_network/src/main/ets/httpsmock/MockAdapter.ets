import AxiosMockAdapter from '@hw-agconnect/axios-mock-adapter';
import instance from '../https/Request';
import { HomeMockApis } from './mockapis/HomeMock';
import { ProductMockApis } from './mockapis/ProductMock';
import { ShoppingCartMockApis } from './mockapis/ShoppingCartMock';

const mockAdapter = new AxiosMockAdapter(instance, {
  delayResponse: 300,
});

new HomeMockApis().start(mockAdapter);
new ProductMockApis().start(mockAdapter);
new ShoppingCartMockApis().start(mockAdapter);

import { CartDto, CartSkuItem } from '../../types/ProductTypes';
import { MockProductData } from './MockProductData';

interface PresetCartItem {
  skuCode: string;
  count: number;
}

const PRESET_CART_ITEMS: PresetCartItem[] = [
  { skuCode: 'sku_100001', count: 1 },
  { skuCode: 'sku_100004', count: 2 },
  { skuCode: 'sku_200001', count: 1 },
  { skuCode: 'sku_200004', count: 1 },
  { skuCode: 'sku_300001', count: 2 },
  { skuCode: 'sku_300003', count: 1 },
];

export function createPresetCartData(): CartDto {
  const cards: CartSkuItem[] = [];
  PRESET_CART_ITEMS.forEach((preset: PresetCartItem) => {
    const sku = MockProductData.PRODUCT_SKU_TABLE.find((item) => item.skuCode === preset.skuCode);
    if (sku) {
      cards.push({
        productId: sku.productId,
        skuCode: sku.skuCode,
        skuDesc: sku.skuDesc,
        stock: sku.stock,
        count: preset.count,
        banner: sku.banner,
        title: sku.title,
        serviceDesc: sku.serviceDesc,
        price: sku.price,
        dashPrice: sku.dashPrice,
        isSelected: false,
        priceType: sku.priceType,
      });
    }
  });
  return {
    version: 'preset-cart-v1',
    total: cards.length,
    cards,
  };
}

export interface ListCard {
  orderNo: string;
  orderTime: string;
  status: string;
  statusKey: string;
  statusDesc: string;
  shopName: string;
  shopIcon: ResourceStr;
  image: ResourceStr;
  title: string;
  spec: string;
  count: number;
  price: string;
  payPrice: string;
  totalText: string;
  actions: string[];
}

export interface OrderTabItem {
  label: string;
  value: string;
}

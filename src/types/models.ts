// 课程作业：与 Supabase 表结构对应的前端类型。
// 数据库字段为 snake_case，页面展示时可映射为中文文案。

export type UserRole = 'customer' | 'merchant';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export interface ShopProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  cover_image_url: string | null;
  category_id: string | null;
  sales_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface ShopAddress {
  id: string;
  user_id: string;
  receiver_name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopCartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ShopCoupon {
  id: string;
  code: string;
  title: string;
  description: string | null;
  min_amount: number;
  discount_amount: number;
  starts_at: string;
  ends_at: string;
  total_quantity: number;
  claimed_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ShopUserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  status: 'unused' | 'used';
  claimed_at: string;
  used_at: string | null;
}

export interface ShopOrder {
  id: string;
  order_no: string;
  user_id: string;
  address_id: string | null;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  total_amount: number;
  discount_amount: number;
  payable_amount: number;
  coupon_id: string | null;
  user_coupon_id: string | null;
  status: OrderStatus;
  remark: string | null;
  logistics_company: string | null;
  tracking_no: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface ShopReview {
  id: string;
  order_item_id: string;
  order_id: string;
  product_id: string | null;
  user_id: string;
  rating: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderLogistics {
  id: string;
  order_id: string;
  description: string;
  location: string | null;
  happened_at: string;
  created_at: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消'
};

export const ORDER_STATUS_TONES: Record<
  OrderStatus,
  'warning' | 'info' | 'brand' | 'success' | 'neutral'
> = {
  pending_payment: 'warning',
  paid: 'info',
  shipped: 'brand',
  completed: 'success',
  cancelled: 'neutral'
};

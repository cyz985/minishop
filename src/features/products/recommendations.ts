// 课程作业：商品推荐（扩展功能）。
// 推荐思路：优先使用当前用户的购买历史提取偏好分类，再按分类销量排序；
// 没有登录或没有购买记录时，回退为全站热销榜。

import { supabase } from '../../lib/supabase';
import type { ProductWithCategory } from './ProductCard';

async function queryActiveProducts(
  categoryIds: string[],
  excludeProductId: string | undefined,
  limit: number
): Promise<ProductWithCategory[]> {
  if (!supabase) return [];

  let query = supabase
    .from('shop_products')
    .select('*, category:shop_categories(id, name, slug)')
    .eq('is_active', true)
    .order('sales_count', { ascending: false })
    .limit(limit);

  if (categoryIds.length > 0) {
    query = query.in('category_id', categoryIds);
  }
  if (excludeProductId) {
    query = query.neq('id', excludeProductId);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as ProductWithCategory[];
}

export async function fetchRecommendedProducts({
  excludeProductId,
  categoryId,
  limit = 4
}: {
  excludeProductId?: string;
  categoryId?: string | null;
  limit?: number;
} = {}): Promise<ProductWithCategory[]> {
  if (!supabase) return [];

  const preferredCategoryIds: string[] = [];

  if (categoryId) {
    preferredCategoryIds.push(categoryId);
  } else {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (userId) {
      const { data: orders } = await supabase
        .from('shop_orders')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      const orderIds = ((orders ?? []) as Array<{ id: string }>).map((order) => order.id);

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('shop_order_items')
          .select('product_id')
          .in('order_id', orderIds);

        const productIds = ((items ?? []) as Array<{ product_id: string | null }>)
          .map((item) => item.product_id)
          .filter((value): value is string => Boolean(value));

        if (productIds.length > 0) {
          const { data: purchasedProducts } = await supabase
            .from('shop_products')
            .select('id, category_id')
            .in('id', productIds);

          (purchasedProducts ?? []).forEach((product) => {
            const row = product as { category_id: string | null };
            if (row.category_id && !preferredCategoryIds.includes(row.category_id)) {
              preferredCategoryIds.push(row.category_id);
            }
          });
        }
      }
    }
  }

  const preferred = await queryActiveProducts(
    preferredCategoryIds,
    excludeProductId,
    limit
  );
  if (preferred.length > 0) return preferred;

  // 分类内没有可推荐商品时，回退到全站热销。
  return queryActiveProducts([], excludeProductId, limit);
}

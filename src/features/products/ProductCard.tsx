// 课程作业：商品卡片，商品列表与推荐区共用。

import { Link } from 'react-router-dom';
import type { ShopCategory, ShopProduct } from '../../types/models';
import { formatCurrency } from '../../lib/utils';
import { Badge } from '../../components/ui/Badge';

export interface ProductWithCategory extends ShopProduct {
  category: Pick<ShopCategory, 'id' | 'name' | 'slug'> | null;
}

export function ProductCard({ product }: { product: ProductWithCategory }) {
  const isSoldOut = product.stock <= 0;

  return (
    <Link
      to={`/products/${product.id}`}
      className="focus-ring group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-brand-50 text-3xl font-semibold text-brand-300">
            {product.name.slice(0, 1)}
          </div>
        )}
        {isSoldOut ? (
          <span className="absolute left-2 top-2 rounded bg-zinc-900/80 px-2 py-0.5 text-xs text-white">
            已售罄
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category ? (
          <Badge tone="neutral" className="w-fit">
            {product.category.name}
          </Badge>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <p className="text-lg font-semibold text-brand-600">
            {formatCurrency(product.price)}
          </p>
          <p className="text-xs text-zinc-400">已售 {product.sales_count}</p>
        </div>
      </div>
    </Link>
  );
}

// 课程作业：商品推荐区块，首页与商品详情复用。

import { useEffect, useState } from 'react';
import { Spinner } from '../../components/ui/Spinner';
import { fetchRecommendedProducts } from './recommendations';
import { ProductCard, type ProductWithCategory } from './ProductCard';

export function RecommendedProducts({
  title = '为你推荐',
  excludeProductId,
  categoryId
}: {
  title?: string;
  excludeProductId?: string;
  categoryId?: string | null;
}) {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    fetchRecommendedProducts({ excludeProductId, categoryId })
      .then((data) => {
        if (!active) return;
        setProducts(data);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [excludeProductId, categoryId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
        <Spinner size="sm" />
        正在生成推荐...
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-400">基于购买偏好与销量</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

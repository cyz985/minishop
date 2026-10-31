// 课程作业：商品详情页。
// 展示商品图片、分类、价格、库存、销量，并支持选择数量加入购物车。

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { StarRating } from '../reviews/StarRating';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import type {
  ShopCategory,
  ShopProduct,
  ShopProductImage
} from '../../types/models';
import { RecommendedProducts } from './RecommendedProducts';

interface ProductDetail extends ShopProduct {
  category: Pick<ShopCategory, 'id' | 'name' | 'slug'> | null;
  images: ShopProductImage[] | null;
}

interface ProductReview {
  id: string;
  rating: number;
  content: string;
  created_at: string;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  useEffect(() => {
    let active = true;
    setProduct(null);
    setActiveImage(null);
    setQuantity(1);
    setError(null);
    setReviews([]);

    async function load() {
      if (!id) {
        setError('缺少商品参数');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const client = requireSupabase();
      const [productResult, reviewResult] = await Promise.all([
        client
          .from('shop_products')
          .select(
            '*, category:shop_categories(id, name, slug), images:shop_product_images(id, image_url, sort_order)'
          )
          .eq('id', id)
          .eq('is_active', true)
          .maybeSingle(),
        client
          .from('shop_reviews')
          .select('id, rating, content, created_at')
          .eq('product_id', id)
          .order('created_at', { ascending: false })
      ]);

      if (!active) return;

      const { data, error: queryError } = productResult;

      if (queryError) {
        setError(getErrorMessage(queryError));
      } else if (!data) {
        setError('商品不存在或已下架');
      } else {
        const detail = data as ProductDetail;
        detail.images = (detail.images ?? []).slice().sort(
          (a, b) => a.sort_order - b.sort_order
        );
        setProduct(detail);
      }

      if (!reviewResult.error) {
        setReviews((reviewResult.data ?? []) as ProductReview[]);
      }

      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const gallery = useMemo(() => product?.images ?? [], [product]);

  async function handleAddToCart() {
    if (!product) return;

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`);
      return;
    }

    setIsAdding(true);
    try {
      const client = requireSupabase();
      const { data: existing, error: existError } = await client
        .from('shop_cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existError) throw existError;

      if (existing) {
        const nextQuantity = (existing as { quantity: number }).quantity + quantity;
        const { error: updateError } = await client
          .from('shop_cart_items')
          .update({ quantity: nextQuantity })
          .eq('id', (existing as { id: string }).id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await client.from('shop_cart_items').insert({
          user_id: user.id,
          product_id: product.id,
          quantity
        });
        if (insertError) throw insertError;
      }

      showToast({
        tone: 'success',
        title: '已加入购物车',
        description: `${product.name} × ${quantity}`
      });
    } catch (addError) {
      showToast({ tone: 'error', title: '加入购物车失败', description: getErrorMessage(addError) });
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) return <FullPageLoading label="正在加载商品详情..." />;

  if (error || !product) {
    return (
      <div className="space-y-4 py-6">
        <ErrorState title="无法查看商品" description={error ?? '商品不存在'} />
        <div className="text-center">
          <Link to="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            返回商品列表
          </Link>
        </div>
      </div>
    );
  }

  const soldOut = product.stock <= 0;
  const mainImage = activeImage ?? product.cover_image_url ?? gallery[0]?.image_url ?? null;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-6 py-2">
      <nav className="flex items-center gap-2 text-xs text-zinc-500">
        <Link to="/" className="hover:text-brand-600">
          商品列表
        </Link>
        <span>/</span>
        <span className="truncate text-zinc-700">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="aspect-square bg-zinc-100">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-50 text-5xl font-semibold text-brand-300">
                {product.name.slice(0, 1)}
              </div>
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto p-3">
              {gallery.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(image.image_url)}
                  className={`focus-ring h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    mainImage === image.image_url ? 'border-brand-500' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image.image_url}
                    alt={`${product.name} 图片`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {product.category ? <Badge tone="brand">{product.category.name}</Badge> : null}
            {soldOut ? <Badge tone="neutral">已售罄</Badge> : <Badge tone="success">有货</Badge>}
          </div>

          <h1 className="text-2xl font-semibold text-zinc-900">{product.name}</h1>

          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-semibold text-brand-600">
              {formatCurrency(product.price)}
            </p>
            <p className="text-sm text-zinc-500">已售 {product.sales_count} 件</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <StarRating value={averageRating} />
            <span>
              {reviews.length > 0
                ? `${averageRating.toFixed(1)} 分 · ${reviews.length} 条评价`
                : '暂无评价'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-4 text-sm">
            <p className="text-zinc-500">
              库存：<span className="font-medium text-zinc-900">{product.stock} 件</span>
            </p>
            <p className="text-zinc-500">
              上架状态：<span className="font-medium text-zinc-900">在售</span>
            </p>
          </div>

          <div>
            <p className="whitespace-pre-line text-sm leading-6 text-zinc-600">
              {product.description || '商家暂未填写商品描述。'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4">
            <div className="flex items-center rounded-lg border border-zinc-300">
              <button
                type="button"
                className="focus-ring h-10 w-10 text-lg text-zinc-600 disabled:opacity-40"
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                className="focus-ring h-10 w-10 text-lg text-zinc-600 disabled:opacity-40"
                disabled={quantity >= Math.min(product.stock, 999)}
                onClick={() =>
                  setQuantity((value) => Math.min(Math.min(product.stock, 999), value + 1))
                }
              >
                +
              </button>
            </div>

            <Button
              size="lg"
              className="min-w-[10rem]"
              disabled={soldOut}
              isLoading={isAdding}
              onClick={() => void handleAddToCart()}
            >
              {soldOut ? '已售罄' : '加入购物车'}
            </Button>

            <Link
              to="/cart"
              className="focus-ring inline-flex h-11 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-brand-400"
            >
              去购物车
            </Link>
          </div>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">商品评价</h2>
          <p className="text-xs text-zinc-500">仅购买并完成订单的用户可评价</p>
        </div>

        {reviews.length === 0 ? (
          <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            暂无评价，完成订单后欢迎分享使用体验。
          </p>
        ) : (
          <div className="mt-4 divide-y divide-zinc-100">
            {reviews.map((review) => (
              <div key={review.id} className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StarRating value={review.rating} />
                  <span className="text-xs text-zinc-400">
                    {formatDateTime(review.created_at)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700">
                  {review.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <RecommendedProducts
        title="相关推荐"
        excludeProductId={product.id}
        categoryId={product.category_id}
      />
    </div>
  );
}

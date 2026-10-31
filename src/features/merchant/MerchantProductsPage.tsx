// 课程作业：商家商品管理（扩展功能）。
// 查看全部商品，支持上下架切换与编辑入口。

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import type { ShopCategory, ShopProduct } from '../../types/models';

type MerchantProduct = ShopProduct & {
  category: Pick<ShopCategory, 'id' | 'name'> | null;
};

export function MerchantProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await requireSupabase()
        .from('shop_products')
        .select('*, category:shop_categories(id, name)')
        .order('created_at', { ascending: false });

      if (!active) return;

      if (queryError) {
        setError(getErrorMessage(queryError));
      } else {
        setProducts((data ?? []) as unknown as MerchantProduct[]);
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function toggleActive(product: MerchantProduct) {
    setBusyId(product.id);
    try {
      const { error: updateError } = await requireSupabase()
        .from('shop_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      if (updateError) throw updateError;
      setProducts((prev) =>
        prev.map((row) =>
          row.id === product.id ? { ...row, is_active: !row.is_active } : row
        )
      );
      showToast({
        tone: 'success',
        title: product.is_active ? '商品已下架' : '商品已上架'
      });
    } catch (updateError) {
      showToast({ tone: 'error', title: '操作失败', description: getErrorMessage(updateError) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="商品管理"
        description="商品上下架后，用户端会立即按新的可见性展示。"
        actions={
          <Link
            to="/merchant/products/new"
            className="focus-ring inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            新增商品
          </Link>
        }
      />

      {isLoading ? (
        <FullPageLoading label="正在加载商品..." />
      ) : error ? (
        <ErrorState
          title="商品加载失败"
          description={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="还没有商品"
          description="创建第一个商品，开始经营你的小铺。"
          action={
            <Link
              to="/merchant/products/new"
              className="focus-ring inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              新增商品
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">商品</th>
                  <th className="px-4 py-3 text-left font-medium">分类</th>
                  <th className="px-4 py-3 text-right font-medium">价格</th>
                  <th className="px-4 py-3 text-right font-medium">库存</th>
                  <th className="px-4 py-3 text-right font-medium">销量</th>
                  <th className="px-4 py-3 text-center font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                          {product.cover_image_url ? (
                            <img
                              src={product.cover_image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-brand-50 text-xs font-semibold text-brand-300">
                              {product.name.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <p className="max-w-[16rem] truncate font-medium text-zinc-900">
                          {product.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {product.category?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700">{product.stock}</td>
                    <td className="px-4 py-3 text-right text-zinc-700">
                      {product.sales_count}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={product.is_active ? 'success' : 'neutral'}>
                        {product.is_active ? '在售' : '已下架'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/merchant/products/${product.id}/edit`}
                          className="focus-ring inline-flex h-8 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:border-brand-400"
                        >
                          编辑
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={busyId === product.id}
                          onClick={() => void toggleActive(product)}
                        >
                          {product.is_active ? '下架' : '上架'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// 课程作业：购物车页。
// 支持数量增减、删除、库存校验与金额合计；结算时跳转到 /checkout。

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface CartProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  cover_image_url: string | null;
  is_active: boolean;
}

interface CartRow {
  id: string;
  quantity: number;
  product: CartProduct | null;
}

export function CartPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CartRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await requireSupabase()
        .from('shop_cart_items')
        .select(
          'id, quantity, product:shop_products(id, name, price, stock, cover_image_url, is_active)'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!active) return;

      if (queryError) {
        setError(getErrorMessage(queryError));
      } else {
        setRows((data ?? []) as unknown as CartRow[]);
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  const validRows = rows.filter((row) => row.product && row.product.is_active);
  const total = useMemo(
    () =>
      validRows.reduce(
        (sum, row) => sum + Number(row.product?.price ?? 0) * row.quantity,
        0
      ),
    [validRows]
  );

  async function updateQuantity(row: CartRow, nextQuantity: number) {
    if (!row.product) return;
    if (nextQuantity < 1) return;
    if (nextQuantity > row.product.stock) {
      showToast({
        tone: 'warning',
        title: '超过库存',
        description: `「${row.product.name}」当前库存 ${row.product.stock} 件`
      });
      return;
    }

    setBusyId(row.id);
    try {
      const { error: updateError } = await requireSupabase()
        .from('shop_cart_items')
        .update({ quantity: nextQuantity })
        .eq('id', row.id);
      if (updateError) throw updateError;
      setRows((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, quantity: nextQuantity } : item))
      );
    } catch (updateError) {
      showToast({ tone: 'error', title: '修改数量失败', description: getErrorMessage(updateError) });
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(row: CartRow) {
    setBusyId(row.id);
    try {
      const { error: deleteError } = await requireSupabase()
        .from('shop_cart_items')
        .delete()
        .eq('id', row.id);
      if (deleteError) throw deleteError;
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast({ tone: 'success', title: '已移出购物车' });
    } catch (deleteError) {
      showToast({ tone: 'error', title: '删除失败', description: getErrorMessage(deleteError) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="购物车"
        description="调整商品数量后进入结算，下单时会再次校验库存。"
      />

      {isLoading ? (
        <FullPageLoading label="正在加载购物车..." />
      ) : error ? (
        <ErrorState
          title="购物车加载失败"
          description={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="购物车还是空的"
          description="去商品列表挑选喜欢的商品吧。"
          action={
            <Link
              to="/"
              className="focus-ring inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              去逛逛
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-3">
            {rows.map((row) => {
              const product = row.product;
              const unavailable = !product || !product.is_active;

              return (
                <Card key={row.id} className="flex gap-4 p-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {product?.cover_image_url ? (
                      <img
                        src={product.cover_image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-brand-50 text-xl font-semibold text-brand-300">
                        {(product?.name ?? '下').slice(0, 1)}
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {product ? (
                      <Link
                        to={`/products/${product.id}`}
                        className="line-clamp-1 text-sm font-medium text-zinc-900 hover:text-brand-600"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-zinc-500">商品已下架或不存在</p>
                    )}
                    <p className="text-sm font-semibold text-brand-600">
                      {formatCurrency(product?.price ?? 0)}
                    </p>
                    {unavailable ? (
                      <p className="text-xs text-red-600">该商品当前不可结算，请移除</p>
                    ) : (
                      <p className="text-xs text-zinc-500">库存 {product.stock} 件</p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                      {!unavailable ? (
                        <div className="flex items-center rounded-lg border border-zinc-300">
                          <button
                            type="button"
                            className="focus-ring h-8 w-8 text-zinc-600 disabled:opacity-40"
                            disabled={row.quantity <= 1 || busyId === row.id}
                            onClick={() => void updateQuantity(row, row.quantity - 1)}
                          >
                            −
                          </button>
                          <span className="w-9 text-center text-sm">{row.quantity}</span>
                          <button
                            type="button"
                            className="focus-ring h-8 w-8 text-zinc-600 disabled:opacity-40"
                            disabled={busyId === row.id || row.quantity >= product.stock}
                            onClick={() => void updateQuantity(row, row.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-3">
                        {!unavailable ? (
                          <p className="text-sm font-medium text-zinc-900">
                            小计 {formatCurrency(Number(product.price) * row.quantity)}
                          </p>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={busyId === row.id}
                          onClick={() => void removeItem(row)}
                        >
                          移除
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit p-5 lg:sticky lg:top-24">
            <h2 className="text-base font-semibold text-zinc-900">订单汇总</h2>
            <div className="mt-4 space-y-2 text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>商品件数</span>
                <span>{validRows.reduce((sum, row) => sum + row.quantity, 0)} 件</span>
              </div>
              <div className="flex justify-between">
                <span>商品金额</span>
                <span className="font-medium text-zinc-900">{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="mt-4 border-t border-zinc-200 pt-4">
              <Button
                className="w-full"
                disabled={validRows.length === 0}
                onClick={() => navigate('/checkout')}
              >
                去结算
              </Button>
              <p className="mt-2 text-center text-xs text-zinc-400">
                下单时会校验库存并生成待支付订单
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

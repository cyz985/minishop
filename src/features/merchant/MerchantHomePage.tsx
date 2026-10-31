// 课程作业：商家后台首页（扩展功能）。
// 汇总商品数量、在售数量与各状态订单数量，提供后台快捷入口。

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';

interface Counts {
  products: number;
  activeProducts: number;
  pending: number;
  paid: number;
  shipped: number;
  completed: number;
}

export function MerchantHomePage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      const client = requireSupabase();
      const results = await Promise.all([
        client.from('shop_products').select('*', { count: 'exact', head: true }),
        client
          .from('shop_products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        client
          .from('shop_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_payment'),
        client
          .from('shop_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'paid'),
        client
          .from('shop_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'shipped'),
        client
          .from('shop_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
      ]);

      if (!active) return;

      const failed = results.find((result) => result.error);
      if (failed?.error) {
        setError(getErrorMessage(failed.error));
        setIsLoading(false);
        return;
      }

      setCounts({
        products: results[0].count ?? 0,
        activeProducts: results[1].count ?? 0,
        pending: results[2].count ?? 0,
        paid: results[3].count ?? 0,
        shipped: results[4].count ?? 0,
        completed: results[5].count ?? 0
      });
      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const statCards: Array<{ key: keyof Counts; label: string }> = [
    { key: 'products', label: '商品总数' },
    { key: 'activeProducts', label: '在售商品' },
    { key: 'pending', label: '待支付订单' },
    { key: 'paid', label: '待发货订单' },
    { key: 'shipped', label: '已发货订单' },
    { key: 'completed', label: '已完成订单' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="商家后台"
        description="管理商品上下架，处理订单支付、发货与完成。"
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
        <div className="text-sm text-zinc-500">正在加载统计数据...</div>
      ) : error ? (
        <ErrorState title="统计数据加载失败" description={error} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {statCards.map((card) => (
            <Card key={card.key} className="p-5">
              <p className="text-xs text-zinc-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900">
                {counts?.[card.key] ?? 0}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-zinc-900">商品管理</h2>
          <p className="mt-1 text-sm text-zinc-500">
            新增、编辑商品信息，调整库存与上下架状态。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/merchant/products"
              className="focus-ring inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              商品列表
            </Link>
            <Link
              to="/merchant/products/new"
              className="focus-ring inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-brand-400"
            >
              新增商品
            </Link>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-zinc-900">订单处理</h2>
          <p className="mt-1 text-sm text-zinc-500">
            待支付 {counts?.pending ?? 0} · 待发货 {counts?.paid ?? 0} · 已发货{' '}
            {counts?.shipped ?? 0} · 已完成 {counts?.completed ?? 0}
          </p>
          <div className="mt-4">
            <Link
              to="/merchant/orders"
              className="focus-ring inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              查看全部订单
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// 课程作业：商家全部订单列表（扩展功能）。
// 商家可查看所有用户的订单，并按状态筛选，进入订单详情推进状态。

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type ShopOrder,
  type ShopOrderItem
} from '../../types/models';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';

type StatusFilter = 'all' | OrderStatus;

type MerchantOrderRow = ShopOrder & {
  items: Array<Pick<ShopOrderItem, 'id' | 'quantity'>>;
};

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部' },
  ...(
    ['pending_payment', 'paid', 'shipped', 'completed', 'cancelled'] as OrderStatus[]
  ).map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] }))
];

export function MerchantOrdersPage() {
  const [orders, setOrders] = useState<MerchantOrderRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      let query = requireSupabase()
        .from('shop_orders')
        .select('*, items:shop_order_items(id, quantity)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error: queryError } = await query;

      if (!active) return;

      if (queryError) {
        setError(getErrorMessage(queryError));
      } else {
        setOrders((data ?? []) as unknown as MerchantOrderRow[]);
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="全部订单"
        description="查看所有用户的订单，并在详情页推进支付、发货与完成状态。"
        actions={
          <Link
            to="/merchant"
            className="focus-ring inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-brand-400"
          >
            返回工作台
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`focus-ring rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === item.value
                ? 'bg-brand-600 text-white'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:border-brand-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <FullPageLoading label="正在加载订单..." />
      ) : error ? (
        <ErrorState
          title="订单加载失败"
          description={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : orders.length === 0 ? (
        <EmptyState title="暂无订单" description="用户下单后会展示在这里。" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">订单号</th>
                  <th className="px-4 py-3 text-left font-medium">下单时间</th>
                  <th className="px-4 py-3 text-left font-medium">收货人</th>
                  <th className="px-4 py-3 text-right font-medium">件数</th>
                  <th className="px-4 py-3 text-right font-medium">应付金额</th>
                  <th className="px-4 py-3 text-center font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3 font-medium text-zinc-900">{order.order_no}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{order.receiver_name}</td>
                    <td className="px-4 py-3 text-right text-zinc-700">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-brand-600">
                      {formatCurrency(order.payable_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Link
                          to={`/merchant/orders/${order.id}`}
                          className="focus-ring inline-flex h-8 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:border-brand-400"
                        >
                          查看详情
                        </Link>
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

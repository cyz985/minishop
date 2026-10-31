// 课程作业：我的订单列表。
// 支持按状态筛选，展示订单商品快照、金额与详情入口。

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type ShopOrder,
  type ShopOrderItem
} from '../../types/models';
import { OrderStatusBadge } from './OrderStatusBadge';

type StatusFilter = 'all' | OrderStatus;

interface OrderWithItems extends ShopOrder {
  items: ShopOrderItem[];
}

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部' },
  ...(
    ['pending_payment', 'paid', 'shipped', 'completed', 'cancelled'] as OrderStatus[]
  ).map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] }))
];

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      let query = requireSupabase()
        .from('shop_orders')
        .select('*, items:shop_order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error: queryError } = await query;

      if (!active) return;

      if (queryError) {
        setError(getErrorMessage(queryError));
      } else {
        setOrders((data ?? []) as OrderWithItems[]);
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, filter, reloadKey]);

  return (
    <div className="space-y-6">
      <PageHeader title="我的订单" description="查看订单状态、商品快照与金额明细。" />

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
        <EmptyState
          title="暂无订单"
          description="下单后可以在这里查看订单状态。"
          action={
            <Link
              to="/"
              className="focus-ring inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              去选购商品
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>订单号 {order.order_no}</span>
                  <span>{formatDateTime(order.created_at)}</span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="divide-y divide-zinc-100 px-5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-brand-50 text-sm font-semibold text-brand-300">
                          {item.product_name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm text-zinc-900">{item.product_name}</p>
                      <p className="text-xs text-zinc-500">
                        {formatCurrency(item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm text-zinc-700">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3">
                <p className="text-sm text-zinc-500">
                  共 {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件，
                  实付{' '}
                  <span className="text-lg font-semibold text-brand-600">
                    {formatCurrency(order.payable_amount)}
                  </span>
                </p>
                <div className="flex gap-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="focus-ring inline-flex h-8 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:border-brand-400"
                  >
                    查看详情
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

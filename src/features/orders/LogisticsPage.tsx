// 课程作业：订单物流跟踪（扩展功能）。
// 展示物流公司与运单号，并按时间顺序渲染 shop_order_logistics 时间线。

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';
import type { ShopOrder, ShopOrderLogistics } from '../../types/models';
import { OrderStatusBadge } from './OrderStatusBadge';

type LogisticsOrder = Pick<
  ShopOrder,
  | 'id'
  | 'order_no'
  | 'status'
  | 'logistics_company'
  | 'tracking_no'
  | 'receiver_name'
  | 'created_at'
>;

export function LogisticsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<LogisticsOrder | null>(null);
  const [logs, setLogs] = useState<ShopOrderLogistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id || !user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const client = requireSupabase();
      const [orderResult, logResult] = await Promise.all([
        client
          .from('shop_orders')
          .select(
            'id, order_no, status, logistics_company, tracking_no, receiver_name, created_at'
          )
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle(),
        client
          .from('shop_order_logistics')
          .select('*')
          .eq('order_id', id)
          .order('happened_at', { ascending: true })
      ]);

      if (!active) return;

      if (orderResult.error) {
        setError(getErrorMessage(orderResult.error));
      } else if (!orderResult.data) {
        setError('订单不存在或无权查看');
      } else {
        setOrder(orderResult.data as LogisticsOrder);
      }

      if (!logResult.error) {
        setLogs((logResult.data ?? []) as ShopOrderLogistics[]);
      }

      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [id, user, reloadKey]);

  if (isLoading) return <FullPageLoading label="正在加载物流信息..." />;
  if (error || !order) {
    return (
      <div className="space-y-4 py-4">
        <ErrorState
          title="无法查看物流"
          description={error ?? '订单不存在'}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
        <div className="text-center">
          <Link to="/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            返回订单列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-xs text-zinc-500">
        <Link to="/orders" className="hover:text-brand-600">
          我的订单
        </Link>
        <span>/</span>
        <Link to={`/orders/${order.id}`} className="hover:text-brand-600">
          {order.order_no}
        </Link>
        <span>/</span>
        <span className="text-zinc-700">物流跟踪</span>
      </nav>

      <PageHeader
        title="物流跟踪"
        description={`订单 ${order.order_no} · 收货人 ${order.receiver_name}`}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-zinc-500">物流公司</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              {order.logistics_company ?? '待商家发货'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">运单号</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              {order.tracking_no ?? '暂无'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">下单时间</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900">物流时间线</h2>
          {logs.length > 0 ? <Badge tone="neutral">{logs.length} 个节点</Badge> : null}
        </div>

        {logs.length === 0 ? (
          <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            暂无物流节点，商家发货后会在这里更新。
          </p>
        ) : (
          <ol className="mt-5 space-y-4 border-l border-zinc-200 pl-5">
            {logs
              .slice()
              .reverse()
              .map((log, index) => (
                <li key={log.id} className="relative">
                  <span
                    className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ${
                      index === 0 ? 'bg-brand-500' : 'bg-zinc-300'
                    }`}
                  />
                  <p className={index === 0 ? 'text-sm font-medium text-zinc-900' : 'text-sm text-zinc-700'}>
                    {log.description}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {formatDateTime(log.happened_at)}
                    {log.location ? ` · ${log.location}` : ''}
                  </p>
                </li>
              ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

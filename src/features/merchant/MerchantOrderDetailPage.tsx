// 课程作业：商家订单详情（扩展功能）。
// 商家可确认收款、填写物流信息发货、标记完成或取消待支付订单。
// 所有状态流转均通过数据库函数 shop_merchant_set_order_status 保证事务一致性。

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import type {
  ShopOrder,
  ShopOrderItem,
  ShopOrderLogistics
} from '../../types/models';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';

type MerchantOrderDetail = ShopOrder & { items: ShopOrderItem[] };

type MerchantActionStatus = 'paid' | 'shipped' | 'completed' | 'cancelled';

export function MerchantOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [order, setOrder] = useState<MerchantOrderDetail | null>(null);
  const [logs, setLogs] = useState<ShopOrderLogistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [logisticsCompany, setLogisticsCompany] = useState('');
  const [trackingNo, setTrackingNo] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const client = requireSupabase();
      const [orderResult, logResult] = await Promise.all([
        client
          .from('shop_orders')
          .select('*, items:shop_order_items(*)')
          .eq('id', id)
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
        setError('订单不存在');
      } else {
        const detail = orderResult.data as MerchantOrderDetail;
        setOrder(detail);
        setLogisticsCompany((current) => current || detail.logistics_company || '');
        setTrackingNo((current) => current || detail.tracking_no || '');
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
  }, [id, reloadKey]);

  async function advanceOrder(nextStatus: MerchantActionStatus) {
    if (!order) return;

    if (nextStatus === 'shipped' && !trackingNo.trim()) {
      showToast({ tone: 'warning', title: '请填写物流单号后再发货' });
      return;
    }

    if (
      nextStatus === 'cancelled' &&
      !window.confirm('确定取消该订单吗？订单占用的库存与优惠券会恢复。')
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      const client = requireSupabase();
      const { error: rpcError } = await client.rpc('shop_merchant_set_order_status', {
        p_order_id: order.id,
        p_new_status: nextStatus,
        p_logistics_company:
          nextStatus === 'shipped' ? logisticsCompany.trim() || null : null,
        p_tracking_no: nextStatus === 'shipped' ? trackingNo.trim() : null
      });
      if (rpcError) throw rpcError;

      // 状态推进成功后补充一条物流节点，用户端物流跟踪页可看到时间线。
      const descriptions: Record<MerchantActionStatus, string> = {
        paid: '商家已确认收款，订单进入待发货状态',
        shipped: `商家已发货，物流公司：${
          logisticsCompany.trim() || '商家物流'
        }，运单号：${trackingNo.trim()}`,
        completed: '包裹已签收，订单已完成',
        cancelled: '订单已取消，库存与优惠券已恢复'
      };

      const { error: logError } = await client.from('shop_order_logistics').insert({
        order_id: order.id,
        description: descriptions[nextStatus],
        location: null,
        happened_at: new Date().toISOString()
      });

      showToast({
        tone: 'success',
        title: '订单状态已更新',
        description: descriptions[nextStatus]
      });
      if (logError) {
        showToast({
          tone: 'warning',
          title: '物流节点写入失败',
          description: getErrorMessage(logError)
        });
      }

      if (nextStatus === 'shipped') {
        setTrackingNo('');
      }
      setReloadKey((key) => key + 1);
    } catch (updateError) {
      showToast({
        tone: 'error',
        title: '订单状态更新失败',
        description: getErrorMessage(updateError)
      });
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) return <FullPageLoading label="正在加载订单详情..." />;

  if (error || !order) {
    return (
      <div className="space-y-4 py-4">
        <ErrorState
          title="无法查看订单"
          description={error ?? '订单不存在'}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
        <div className="text-center">
          <Link
            to="/merchant/orders"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            返回全部订单
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-xs text-zinc-500">
        <Link to="/merchant" className="hover:text-brand-600">
          商家后台
        </Link>
        <span>/</span>
        <Link to="/merchant/orders" className="hover:text-brand-600">
          全部订单
        </Link>
        <span>/</span>
        <span className="text-zinc-700">{order.order_no}</span>
      </nav>

      <PageHeader
        title={`订单 ${order.order_no}`}
        description={`下单时间：${formatDateTime(order.created_at)}`}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">商品明细</h2>
            <div className="mt-3 divide-y divide-zinc-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
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
                    <p className="line-clamp-1 text-sm font-medium text-zinc-900">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(item.unit_price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-700">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-zinc-900">物流时间线</h2>
              <span className="text-xs text-zinc-500">{logs.length} 个节点</span>
            </div>
            {logs.length === 0 ? (
              <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                暂无物流节点，发货后会自动写入。
              </p>
            ) : (
              <ol className="mt-4 space-y-4 border-l border-zinc-200 pl-5">
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
                      <p
                        className={
                          index === 0
                            ? 'text-sm font-medium text-zinc-900'
                            : 'text-sm text-zinc-700'
                        }
                      >
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

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">收货信息</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">收货人</dt>
                <dd className="font-medium text-zinc-900">{order.receiver_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">联系电话</dt>
                <dd className="font-medium text-zinc-900">{order.receiver_phone}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">收货地址</dt>
                <dd className="mt-1 text-zinc-700">{order.receiver_address}</dd>
              </div>
              {order.remark ? (
                <div>
                  <dt className="text-zinc-500">买家备注</dt>
                  <dd className="mt-1 text-zinc-700">{order.remark}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">金额明细</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">商品总额</dt>
                <dd className="text-zinc-700">{formatCurrency(order.total_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">优惠金额</dt>
                <dd className="text-zinc-700">
                  -{formatCurrency(order.discount_amount)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2">
                <dt className="text-zinc-500">应付金额</dt>
                <dd className="text-lg font-semibold text-brand-600">
                  {formatCurrency(order.payable_amount)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-base font-semibold text-zinc-900">订单操作</h2>

            {order.status === 'pending_payment' ? (
              <>
                <Alert tone="warning">买家尚未支付，可确认收款或取消订单。</Alert>
                <Button
                  className="w-full"
                  isLoading={isUpdating}
                  onClick={() => void advanceOrder('paid')}
                >
                  标记为已支付
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isUpdating}
                  onClick={() => void advanceOrder('cancelled')}
                >
                  取消订单并恢复库存
                </Button>
              </>
            ) : null}

            {order.status === 'paid' ? (
              <>
                <Alert tone="info">填写物流信息后即可发货。</Alert>
                <Input
                  label="物流公司"
                  value={logisticsCompany}
                  placeholder="例如：顺丰速运"
                  onChange={(event) => setLogisticsCompany(event.target.value)}
                />
                <Input
                  label="运单号"
                  value={trackingNo}
                  placeholder="请输入运单号"
                  onChange={(event) => setTrackingNo(event.target.value)}
                />
                <Button
                  className="w-full"
                  isLoading={isUpdating}
                  onClick={() => void advanceOrder('shipped')}
                >
                  确认发货
                </Button>
              </>
            ) : null}

            {order.status === 'shipped' ? (
              <>
                <Alert tone="info">订单已发货，等待买家确认收货。</Alert>
                <Button
                  className="w-full"
                  isLoading={isUpdating}
                  onClick={() => void advanceOrder('completed')}
                >
                  标记订单已完成
                </Button>
              </>
            ) : null}

            {order.status === 'completed' ? (
              <Alert tone="success">订单已完成，买家可以评价商品。</Alert>
            ) : null}

            {order.status === 'cancelled' ? (
              <Alert tone="info">订单已取消，库存与优惠券已恢复。</Alert>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">时间节点</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">下单</dt>
                <dd className="text-zinc-700">{formatDateTime(order.created_at)}</dd>
              </div>
              {order.paid_at ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">支付</dt>
                  <dd className="text-zinc-700">{formatDateTime(order.paid_at)}</dd>
                </div>
              ) : null}
              {order.shipped_at ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">发货</dt>
                  <dd className="text-zinc-700">{formatDateTime(order.shipped_at)}</dd>
                </div>
              ) : null}
              {order.completed_at ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">完成</dt>
                  <dd className="text-zinc-700">{formatDateTime(order.completed_at)}</dd>
                </div>
              ) : null}
              {order.cancelled_at ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">取消</dt>
                  <dd className="text-zinc-700">{formatDateTime(order.cancelled_at)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

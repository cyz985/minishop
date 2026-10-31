// 课程作业：订单详情页。
// 展示收货地址快照、商品快照、金额明细与时间节点；待支付订单可取消并恢复库存。

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { StarRating } from '../reviews/StarRating';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import type { ShopOrder, ShopOrderItem, ShopReview } from '../../types/models';
import { OrderStatusBadge } from './OrderStatusBadge';

interface OrderDetail extends ShopOrder {
  items: ShopOrderItem[];
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
      const [orderResult, reviewResult] = await Promise.all([
        client
          .from('shop_orders')
          .select('*, items:shop_order_items(*)')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle(),
        client
          .from('shop_reviews')
          .select('*')
          .eq('order_id', id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
      ]);

      if (!active) return;

      if (orderResult.error) {
        setError(getErrorMessage(orderResult.error));
      } else if (!orderResult.data) {
        setError('订单不存在或无权查看');
      } else {
        setOrder(orderResult.data as OrderDetail);
      }

      if (!reviewResult.error) {
        setReviews((reviewResult.data ?? []) as ShopReview[]);
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [id, user, reloadKey]);

  async function cancelOrder() {
    if (!order) return;
    if (!window.confirm('确定取消该订单吗？库存和优惠券会恢复到下单前状态。')) return;

    setIsCancelling(true);
    try {
      const { error: rpcError } = await requireSupabase().rpc('shop_cancel_order', {
        p_order_id: order.id
      });
      if (rpcError) throw rpcError;
      showToast({ tone: 'success', title: '订单已取消', description: '库存已恢复' });
      setReloadKey((key) => key + 1);
    } catch (cancelError) {
      showToast({ tone: 'error', title: '取消订单失败', description: getErrorMessage(cancelError) });
    } finally {
      setIsCancelling(false);
    }
  }

  async function submitReview(item: ShopOrderItem) {
    if (!order || !user || !item.product_id) return;
    if (!reviewContent.trim()) {
      showToast({ tone: 'warning', title: '请填写评价内容' });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const { error: insertError } = await requireSupabase().from('shop_reviews').insert({
        order_item_id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        user_id: user.id,
        rating: reviewRating,
        content: reviewContent.trim()
      });
      if (insertError) throw insertError;

      showToast({ tone: 'success', title: '评价已提交' });
      setReviewingItemId(null);
      setReviewContent('');
      setReviewRating(5);
      setReloadKey((key) => key + 1);
    } catch (reviewError) {
      showToast({ tone: 'error', title: '评价提交失败', description: getErrorMessage(reviewError) });
    } finally {
      setIsSubmittingReview(false);
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
        <span className="text-zinc-700">{order.order_no}</span>
      </nav>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-zinc-900">订单 {order.order_no}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              下单时间：{formatDateTime(order.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.status !== 'pending_payment' && order.status !== 'cancelled' ? (
              <Link
                to={`/orders/${order.id}/logistics`}
                className="focus-ring inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-brand-400"
              >
                物流跟踪
              </Link>
            ) : null}
            {order.status === 'pending_payment' ? (
              <Button
                variant="outline"
                isLoading={isCancelling}
                onClick={() => void cancelOrder()}
              >
                取消订单
              </Button>
            ) : null}
          </div>
        </div>

        {order.status === 'pending_payment' ? (
          <div className="mt-4">
            <Alert tone="warning" title="订单待支付">
              本项目不接入真实支付。订单保持待支付状态，可取消并恢复库存。
            </Alert>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">商品明细</h2>
            <div className="mt-3 divide-y divide-zinc-100">
              {order.items.map((item) => {
                const review = reviews.find((row) => row.order_item_id === item.id);
                const canReview = order.status === 'completed' && Boolean(item.product_id);

                return (
                  <div key={item.id} className="py-3">
                    <div className="flex items-center gap-3">
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
                        {item.product_id ? (
                          <Link
                            to={`/products/${item.product_id}`}
                            className="line-clamp-1 text-sm font-medium text-zinc-900 hover:text-brand-600"
                          >
                            {item.product_name}
                          </Link>
                        ) : (
                          <p className="line-clamp-1 text-sm font-medium text-zinc-900">
                            {item.product_name}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500">
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm text-zinc-700">{formatCurrency(item.subtotal)}</p>
                    </div>

                    {review ? (
                      <div className="mt-2 rounded-lg bg-zinc-50 p-3">
                        <div className="flex items-center gap-2">
                          <StarRating value={review.rating} />
                          <span className="text-xs text-zinc-400">
                            {formatDateTime(review.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm text-zinc-700">
                          {review.content}
                        </p>
                      </div>
                    ) : canReview ? (
                      reviewingItemId === item.id ? (
                        <div className="mt-3 space-y-3 rounded-lg border border-zinc-200 p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-zinc-600">评分</span>
                            <StarRating value={reviewRating} onChange={setReviewRating} />
                          </div>
                          <Textarea
                            rows={3}
                            maxLength={1000}
                            placeholder="分享商品质量、使用感受等"
                            value={reviewContent}
                            onChange={(event) => setReviewContent(event.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              isLoading={isSubmittingReview}
                              onClick={() => void submitReview(item)}
                            >
                              提交评价
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReviewingItemId(null);
                                setReviewContent('');
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            setReviewingItemId(item.id);
                            setReviewRating(5);
                            setReviewContent('');
                          }}
                        >
                          评价商品
                        </Button>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">收货信息</h2>
            <div className="mt-3 space-y-1 text-sm text-zinc-600">
              <p>
                {order.receiver_name}
                <span className="ml-3 text-zinc-500">{order.receiver_phone}</span>
              </p>
              <p className="leading-6">{order.receiver_address}</p>
            </div>
            {order.remark ? (
              <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                备注：{order.remark}
              </p>
            ) : null}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">金额明细</h2>
            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>商品金额</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>优惠金额</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2 text-base font-semibold text-zinc-900">
                <span>应付金额</span>
                <span className="text-brand-600">{formatCurrency(order.payable_amount)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">订单时间</h2>
            <dl className="mt-3 space-y-2 text-xs text-zinc-500">
              <div className="flex justify-between gap-3">
                <dt>创建</dt>
                <dd>{formatDateTime(order.created_at)}</dd>
              </div>
              {order.paid_at ? (
                <div className="flex justify-between gap-3">
                  <dt>支付</dt>
                  <dd>{formatDateTime(order.paid_at)}</dd>
                </div>
              ) : null}
              {order.shipped_at ? (
                <div className="flex justify-between gap-3">
                  <dt>发货</dt>
                  <dd>{formatDateTime(order.shipped_at)}</dd>
                </div>
              ) : null}
              {order.completed_at ? (
                <div className="flex justify-between gap-3">
                  <dt>完成</dt>
                  <dd>{formatDateTime(order.completed_at)}</dd>
                </div>
              ) : null}
              {order.cancelled_at ? (
                <div className="flex justify-between gap-3">
                  <dt>取消</dt>
                  <dd>{formatDateTime(order.cancelled_at)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

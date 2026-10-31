// 课程作业：结算页。
// 选择收货地址 -> 核对购物车商品 -> 调用 shop_create_order RPC 单事务下单。

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import type { ShopAddress, ShopCoupon, ShopUserCoupon } from '../../types/models';

interface CheckoutItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    cover_image_url: string | null;
  } | null;
}

type CheckoutCoupon = ShopUserCoupon & { coupon: ShopCoupon | null };

export function CheckoutPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<ShopAddress[]>([]);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [coupons, setCoupons] = useState<CheckoutCoupon[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedUserCouponId, setSelectedUserCouponId] = useState('');
  const [remark, setRemark] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

      const client = requireSupabase();
      const [addressResult, cartResult, couponResult] = await Promise.all([
        client
          .from('shop_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false }),
        client
          .from('shop_cart_items')
          .select(
            'id, quantity, product:shop_products(id, name, price, stock, cover_image_url)'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        client
          .from('shop_user_coupons')
          .select('*, coupon:shop_coupons(*)')
          .eq('user_id', user.id)
          .eq('status', 'unused')
          .order('claimed_at', { ascending: false })
      ]);

      if (!active) return;

      if (addressResult.error) {
        setError(getErrorMessage(addressResult.error));
      } else if (cartResult.error) {
        setError(getErrorMessage(cartResult.error));
      } else {
        const nextAddresses = (addressResult.data ?? []) as ShopAddress[];
        setAddresses(nextAddresses);
        setSelectedAddressId(
          (current) =>
            current ||
            nextAddresses.find((address) => address.is_default)?.id ||
            nextAddresses[0]?.id ||
            ''
        );
        setItems(
          ((cartResult.data ?? []) as unknown as CheckoutItem[]).filter((item) => item.product)
        );
      }

      if (!couponResult.error) {
        setCoupons((couponResult.data ?? []) as unknown as CheckoutCoupon[]);
      }

      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  const total = items.reduce(
    (sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity,
    0
  );

  const now = Date.now();
  const usableCoupons = coupons.filter((row) => {
    if (!row.coupon || !row.coupon.is_active) return false;
    return (
      new Date(row.coupon.starts_at).getTime() <= now &&
      new Date(row.coupon.ends_at).getTime() >= now &&
      total >= Number(row.coupon.min_amount)
    );
  });
  const selectedCoupon = usableCoupons.find((row) => row.id === selectedUserCouponId) ?? null;
  const discount = selectedCoupon?.coupon
    ? Math.min(Number(selectedCoupon.coupon.discount_amount), total)
    : 0;
  const payable = Math.max(total - discount, 0);

  async function handleSubmit() {
    setSubmitError(null);
    if (!user) return;
    if (!selectedAddressId) {
      setSubmitError('请先选择收货地址');
      return;
    }
    if (items.length === 0) {
      setSubmitError('购物车为空，无法下单');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: rpcError } = await requireSupabase().rpc('shop_create_order', {
        p_address_id: selectedAddressId,
        p_cart_item_ids: null,
        p_user_coupon_id: selectedCoupon?.id ?? null,
        p_remark: remark.trim() ? remark.trim() : null
      });

      if (rpcError) throw rpcError;
      if (!data) throw new Error('订单创建失败，未返回订单编号');

      showToast({
        tone: 'success',
        title: '订单创建成功',
        description: '订单状态为待支付，可在订单详情查看。'
      });
      navigate(`/orders/${data as string}`, { replace: true });
    } catch (submitFailure) {
      const message = getErrorMessage(submitFailure);
      setSubmitError(message);
      showToast({ tone: 'error', title: '下单失败', description: message });
      // 库存可能已变化，重新加载商品与地址信息。
      setReloadKey((key) => key + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <FullPageLoading label="正在加载结算信息..." />;
  if (error) {
    return (
      <ErrorState
        title="结算信息加载失败"
        description={error}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="购物车中没有可结算商品"
        description="请先添加商品，再回到结算页。"
        action={
          <Link
            to="/"
            className="focus-ring inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            去选购商品
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="确认订单" description="核对收货信息与商品明细后提交订单。" />

      {submitError ? <Alert tone="error">{submitError}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-zinc-900">收货地址</h2>
              <Link to="/addresses" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                管理地址
              </Link>
            </div>

            {addresses.length === 0 ? (
              <div className="mt-4">
                <Alert tone="warning" title="还没有收货地址">
                  请先添加收货地址，再返回结算。
                  <div className="mt-3">
                    <Link
                      to="/addresses"
                      className="focus-ring inline-flex h-8 items-center rounded-lg bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      去添加地址
                    </Link>
                  </div>
                </Alert>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`cursor-pointer rounded-lg border p-4 text-sm transition-colors ${
                      selectedAddressId === address.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-zinc-200 bg-white hover:border-brand-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="sr-only"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                    />
                    <p className="font-medium text-zinc-900">
                      {address.receiver_name}
                      <span className="ml-2 font-normal text-zinc-500">{address.phone}</span>
                    </p>
                    <p className="mt-1 leading-6 text-zinc-600">
                      {[address.province, address.city, address.district, address.detail]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                    {address.is_default ? (
                      <p className="mt-2 text-xs font-medium text-brand-600">默认地址</p>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-zinc-900">优惠券</h2>
              <Link to="/coupons" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                去领券
              </Link>
            </div>
            <div className="mt-3">
              {usableCoupons.length === 0 ? (
                <Alert tone="info">
                  当前订单没有可用的优惠券，可前往优惠券中心领取满减券。
                </Alert>
              ) : (
                <Select
                  label="选择优惠券"
                  value={selectedUserCouponId}
                  onChange={(event) => setSelectedUserCouponId(event.target.value)}
                >
                  <option value="">不使用优惠券</option>
                  {usableCoupons.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.coupon?.title}（优惠 {formatCurrency(row.coupon?.discount_amount ?? 0)}）
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-zinc-900">商品明细</h2>
            <div className="mt-4 divide-y divide-zinc-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {item.product?.cover_image_url ? (
                      <img
                        src={item.product.cover_image_url}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-brand-50 text-sm font-semibold text-brand-300">
                        {(item.product?.name ?? '商').slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-zinc-900">
                      {item.product?.name ?? '商品已下架'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(item.product?.price ?? 0)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-zinc-900">
                    {formatCurrency(Number(item.product?.price ?? 0) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <Textarea
              label="订单备注（选填）"
              rows={3}
              maxLength={200}
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              hint="最多 200 字，可填写配送要求。"
              placeholder="例如：工作日送达"
            />
          </Card>
        </div>

        <Card className="h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-zinc-900">金额汇总</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-600">
            <div className="flex justify-between">
              <span>商品件数</span>
              <span>{items.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
            </div>
            <div className="flex justify-between">
              <span>商品金额</span>
              <span className="font-medium text-zinc-900">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span>优惠</span>
              <span className="text-zinc-900">-{formatCurrency(discount)}</span>
            </div>
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <div className="flex items-end justify-between">
              <span className="text-sm text-zinc-600">应付金额</span>
              <span className="text-2xl font-semibold text-brand-600">
                {formatCurrency(payable)}
              </span>
            </div>
            <Button
              className="mt-4 w-full"
              size="lg"
              isLoading={isSubmitting}
              disabled={addresses.length === 0}
              onClick={() => void handleSubmit()}
            >
              提交订单
            </Button>
            <p className="mt-2 text-center text-xs text-zinc-400">
              提交后生成待支付订单，可在订单详情取消
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

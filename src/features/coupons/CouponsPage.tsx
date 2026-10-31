// 课程作业：优惠券中心（扩展功能）。
// 可领取满减券；领取写入 shop_user_coupons，结算时选择未使用券抵扣。

import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
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
import { formatCurrency, formatDateTime } from '../../lib/utils';
import type { ShopCoupon, ShopUserCoupon } from '../../types/models';

type CouponView = ShopCoupon & { userCoupon: ShopUserCoupon | null };

export function CouponsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<CouponView[]>([]);
  const [userCoupons, setUserCoupons] = useState<Array<ShopUserCoupon & { coupon: ShopCoupon | null }>>([]);
  const [tab, setTab] = useState<'available' | 'mine'>('available');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
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
      const [couponResult, userCouponResult] = await Promise.all([
        client
          .from('shop_coupons')
          .select('*')
          .eq('is_active', true)
          .order('min_amount', { ascending: true }),
        client
          .from('shop_user_coupons')
          .select('*, coupon:shop_coupons(*)')
          .eq('user_id', user.id)
          .order('claimed_at', { ascending: false })
      ]);

      if (!active) return;

      if (couponResult.error) {
        setError(getErrorMessage(couponResult.error));
      } else if (userCouponResult.error) {
        setError(getErrorMessage(userCouponResult.error));
      } else {
        const claimedRows = (userCouponResult.data ?? []) as Array<
          ShopUserCoupon & { coupon: ShopCoupon | null }
        >;
        setUserCoupons(claimedRows);
        setCoupons(
          ((couponResult.data ?? []) as ShopCoupon[]).map((coupon) => ({
            ...coupon,
            userCoupon:
              claimedRows.find((row) => row.coupon_id === coupon.id) ?? null
          }))
        );
      }

      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  async function claimCoupon(coupon: CouponView) {
    if (!user) return;

    setClaimingId(coupon.id);
    try {
      const { error: rpcError } = await requireSupabase().rpc('shop_claim_coupon', {
        p_coupon_id: coupon.id
      });
      if (rpcError) throw rpcError;
      showToast({ tone: 'success', title: '领取成功', description: coupon.title });
      setReloadKey((key) => key + 1);
    } catch (claimError) {
      showToast({ tone: 'error', title: '领取失败', description: getErrorMessage(claimError) });
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="优惠券中心" description="领取满减券，结算时自动校验门槛并抵扣。" />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('available')}
          className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === 'available'
              ? 'bg-brand-600 text-white'
              : 'border border-zinc-200 bg-white text-zinc-600'
          }`}
        >
          可领取
        </button>
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === 'mine'
              ? 'bg-brand-600 text-white'
              : 'border border-zinc-200 bg-white text-zinc-600'
          }`}
        >
          我的优惠券
        </button>
      </div>

      {isLoading ? (
        <FullPageLoading label="正在加载优惠券..." />
      ) : error ? (
        <ErrorState
          title="优惠券加载失败"
          description={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : tab === 'available' ? (
        coupons.length === 0 ? (
          <EmptyState title="暂无可领取的优惠券" description="商家发放优惠券后会展示在这里。" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => {
              const claimed = Boolean(coupon.userCoupon);
              const ended = new Date(coupon.ends_at).getTime() < Date.now();

              return (
                <Card key={coupon.id} className="overflow-hidden">
                  <div className="flex items-stretch">
                    <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-brand-50 px-2 py-6">
                      <span className="text-2xl font-semibold text-brand-600">
                        {formatCurrency(coupon.discount_amount)}
                      </span>
                      <span className="mt-1 text-xs text-brand-700">满减券</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
                      <p className="text-sm font-medium text-zinc-900">{coupon.title}</p>
                      <p className="text-xs text-zinc-500">
                        满 {formatCurrency(coupon.min_amount)} 可用
                      </p>
                      {coupon.description ? (
                        <p className="line-clamp-2 text-xs text-zinc-500">{coupon.description}</p>
                      ) : null}
                      <p className="text-[11px] text-zinc-400">
                        有效期至 {formatDateTime(coupon.ends_at)}
                      </p>
                      <div className="mt-auto pt-2">
                        {claimed ? (
                          <Badge tone="success">已领取</Badge>
                        ) : ended ? (
                          <Badge tone="neutral">已结束</Badge>
                        ) : (
                          <Button
                            size="sm"
                            isLoading={claimingId === coupon.id}
                            onClick={() => void claimCoupon(coupon)}
                          >
                            立即领取
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : userCoupons.length === 0 ? (
        <EmptyState
          title="还没有优惠券"
          description="先去“可领取”页面领取一张满减券吧。"
          action={<Button onClick={() => setTab('available')}>去领取</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userCoupons.map((row) => (
            <Card key={row.id} className="p-4">
              {row.coupon ? (
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900">{row.coupon.title}</p>
                    <Badge tone={row.status === 'unused' ? 'success' : 'neutral'}>
                      {row.status === 'unused' ? '未使用' : '已使用'}
                    </Badge>
                  </div>
                  <p className="text-2xl font-semibold text-brand-600">
                    {formatCurrency(row.coupon.discount_amount)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    满 {formatCurrency(row.coupon.min_amount)} 可用
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    有效期至 {formatDateTime(row.coupon.ends_at)}
                  </p>
                  {row.status === 'used' ? (
                    <p className="text-[11px] text-zinc-400">
                      使用时间：{formatDateTime(row.used_at)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <Alert tone="warning">关联的优惠券已失效</Alert>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

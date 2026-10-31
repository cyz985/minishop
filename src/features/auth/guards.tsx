// 课程作业：全局路由鉴权组件。

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { buildLoginRedirect } from '../../lib/utils';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { ErrorState } from '../../components/ui/ErrorState';

/** 登录用户才能进入；未登录跳转登录页并保留回跳地址。 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, authError } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoading label="正在确认登录状态..." />;

  if (authError) {
    return (
      <div className="container-page py-16">
        <ErrorState
          title="登录状态加载失败"
          description={authError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={buildLoginRedirect(location.pathname, location.search)}
        replace
      />
    );
  }

  return <>{children}</>;
}

/** 仅商家可进入；普通用户进入 403 页面。 */
export function MerchantRoute({ children }: { children: ReactNode }) {
  const {
    user,
    profile,
    isLoading,
    isProfileLoading,
    profileError,
    isMerchant,
    refreshProfile
  } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoading label="正在确认登录状态..." />;

  if (!user) {
    return (
      <Navigate
        to={buildLoginRedirect(location.pathname, location.search)}
        replace
      />
    );
  }

  if (isProfileLoading) return <FullPageLoading label="正在校验商家身份..." />;

  if (profileError || !profile) {
    return (
      <div className="container-page py-16">
        <ErrorState
          title="商家身份校验失败"
          description={profileError ?? '未能读取商城用户资料'}
          onRetry={() => void refreshProfile()}
        />
      </div>
    );
  }

  if (!isMerchant) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

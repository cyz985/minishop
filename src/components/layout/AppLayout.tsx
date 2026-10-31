// 课程作业：全局布局（顶部导航 + 内容区 + 页脚）。
// 导航根据登录状态与商家角色动态展示，购物车/订单等入口保持可用。

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

const baseNavItems = [
  { to: '/', label: '首页', end: true },
  { to: '/cart', label: '购物车' },
  { to: '/orders', label: '我的订单' },
  { to: '/coupons', label: '优惠券' }
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
  );
}

export function AppLayout() {
  const { user, profile, isLoading, isMerchant, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/');
    } catch {
      // 退出失败不阻断页面，AuthContext 会保持当前会话。
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              小
            </span>
            <span className="text-base font-semibold text-zinc-900">
              小铺 Mini 商城
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {baseNavItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
            {isMerchant ? (
              <NavLink to="/merchant" className={navLinkClass}>
                商家后台
              </NavLink>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <span className="text-xs text-zinc-400">加载中...</span>
            ) : user ? (
              <>
                <span className="hidden max-w-[10rem] truncate text-sm text-zinc-600 sm:inline">
                  {profile?.display_name ?? user.email ?? '已登录'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
                  退出登录
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  登录
                </NavLink>
                <NavLink
                  to="/register"
                  className="focus-ring inline-flex h-8 items-center rounded-lg bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700"
                >
                  注册
                </NavLink>
              </>
            )}
          </div>
        </div>

        <nav className="container-page flex gap-1 overflow-x-auto pb-2 md:hidden">
          {baseNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
          {isMerchant ? (
            <NavLink to="/merchant" className={navLinkClass}>
              商家后台
            </NavLink>
          ) : null}
        </nav>
      </header>

      <main className="container-page flex-1 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>小铺 Mini 在线商城 · 全栈应用开发课程作业</p>
          <p>React + TypeScript + Vite + TailwindCSS + Supabase</p>
        </div>
      </footer>
    </div>
  );
}

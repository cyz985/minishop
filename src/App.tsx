// 课程作业：应用入口组件。
// Supabase 未配置时直接展示友好提示页，不进入 AuthProvider，避免白屏。

import { RouterProvider } from 'react-router-dom';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './features/auth/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { SupabaseConfigErrorPage } from './pages/SupabaseConfigErrorPage';
import { router } from './router';

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <AppErrorBoundary>
        <SupabaseConfigErrorPage />
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}

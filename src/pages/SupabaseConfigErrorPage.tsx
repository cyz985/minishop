// 课程作业：Supabase 配置缺失时的友好提示页，避免直接白屏。

import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';
import { supabaseSetupError } from '../lib/supabase';

export function SupabaseConfigErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <Card className="w-full max-w-2xl p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
          配置提醒
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          商城暂时无法连接数据库
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          页面没有崩溃，但需要先补齐 Supabase 环境变量，商城才能正常加载。
        </p>

        <div className="mt-5">
          <Alert tone="error" title="当前错误">
            {supabaseSetupError ?? '未检测到 Supabase 配置'}
          </Alert>
        </div>

        <div className="mt-5 space-y-2 text-sm text-zinc-600">
          <p>请在项目根目录的 <code className="rounded bg-zinc-100 px-1">.env</code> 中确认以下变量：</p>
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
{`VITE_SUPABASE_URL=https://你的项目地址.supabase.co
VITE_SUPABASE_ANON_KEY=你的匿名公钥`}
          </pre>
          <p>修改后需要重新启动开发服务器（<code className="rounded bg-zinc-100 px-1">npm run dev</code>）。</p>
        </div>
      </Card>
    </div>
  );
}

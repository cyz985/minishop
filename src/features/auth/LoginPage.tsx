// 课程作业：登录页（Supabase Auth 邮箱密码登录）。
// 支持 ?redirect= 回跳原页面，只允许站内路径，避免开放重定向。

import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';

function safeRedirect(raw: string | null): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (signInError) {
        setError(
          signInError.message === 'Invalid login credentials'
            ? '邮箱或密码不正确'
            : getErrorMessage(signInError)
        );
        return;
      }
      navigate(safeRedirect(searchParams.get('redirect')), { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <PageHeader title="登录" description="登录后可加入购物车、管理地址并下单。" />
      <Card className="mt-6 p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Input
            label="邮箱"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <Input
            label="密码"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            登录
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          还没有账号？{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
            立即注册
          </Link>
        </p>
      </Card>
    </div>
  );
}

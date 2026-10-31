// 课程作业：注册页。
// 注册时把昵称写入 user_metadata，数据库触发器会自动创建 shop_profiles 资料。

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';

export function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError('密码至少需要 6 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: signUpError } = await requireSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || undefined
          }
        }
      });

      if (signUpError) {
        setError(
          signUpError.message.includes('already registered')
            ? '该邮箱已注册，请直接登录'
            : getErrorMessage(signUpError)
        );
        return;
      }

      if (data.session) {
        navigate('/', { replace: true });
        return;
      }

      setNotice('注册成功，请前往邮箱完成验证后再登录。');
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <PageHeader title="注册" description="创建账号后即可使用购物车与订单功能。" />
      <Card className="mt-6 p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {notice ? <Alert tone="success">{notice}</Alert> : null}
          <Input
            label="昵称"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="例如：小明"
            maxLength={40}
            hint="昵称会用于订单与评价展示，可留空使用邮箱前缀。"
          />
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
          />
          <Input
            label="确认密码"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="再次输入密码"
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            注册
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          已有账号？{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            去登录
          </Link>
        </p>
      </Card>
    </div>
  );
}

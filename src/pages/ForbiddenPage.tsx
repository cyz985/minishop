// 课程作业：403 无权限页面（仅商家可访问的页面会跳转到这里）。

import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="p-8 text-center">
        <p className="text-5xl font-bold text-brand-600">403</p>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">没有访问权限</h1>
        <p className="mt-2 text-sm text-zinc-500">
          该页面仅对商家账号开放。如需使用商家后台，请先由管理员将账号角色设置为 merchant。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => window.history.back()}>返回上一页</Button>
          <Link
            to="/"
            className="focus-ring inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-brand-400"
          >
            回到首页
          </Link>
        </div>
      </Card>
    </div>
  );
}

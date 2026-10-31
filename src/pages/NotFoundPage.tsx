// 课程作业：404 页面。

import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="p-8 text-center">
        <p className="text-5xl font-bold text-brand-600">404</p>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">页面不存在</h1>
        <p className="mt-2 text-sm text-zinc-500">
          你访问的地址可能已失效，或者链接输入有误。
        </p>
        <Link
          to="/"
          className="focus-ring mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          回到首页
        </Link>
      </Card>
    </div>
  );
}

// 课程作业：阶段 2 路由骨架使用的占位页面。
// 阶段 3 / 阶段 4 会用真实业务页面替换这里的具体路由。

import { Card } from '../components/ui/Card';

export function PlaceholderPage({
  title,
  description,
  stage
}: {
  title: string;
  description: string;
  stage: '阶段 3' | '阶段 4';
}) {
  return (
    <div className="py-6">
      <Card className="p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
          {stage} 实现
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">{description}</p>
        <p className="mt-6 text-xs text-zinc-400">
          当前为路由骨架页面，用于验证导航、鉴权与整体布局。
        </p>
      </Card>
    </div>
  );
}

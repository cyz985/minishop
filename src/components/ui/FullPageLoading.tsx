// 课程作业：整页加载状态，用于鉴权与首屏数据加载。

import { Spinner } from './Spinner';

export function FullPageLoading({ label = '正在加载...' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
      <Spinner size="lg" />
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

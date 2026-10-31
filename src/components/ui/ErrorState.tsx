// 课程作业：错误状态占位，带重试回调。

import { Button } from './Button';

export function ErrorState({
  title = '加载失败',
  description,
  onRetry,
  retryLabel = '重新加载'
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <p className="text-base font-medium text-red-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-lg text-sm text-red-700">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

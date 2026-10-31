// 课程作业：空状态占位，避免列表为空时页面空白。

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center',
        className
      )}
    >
      <p className="text-base font-medium text-zinc-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

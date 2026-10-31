// 课程作业：统一徽标，订单状态使用 models.ts 中的色调映射。

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type BadgeTone = 'warning' | 'info' | 'brand' | 'success' | 'neutral' | 'danger';

const toneClasses: Record<BadgeTone, string> = {
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  neutral: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
  danger: 'bg-red-50 text-red-700 ring-red-200'
};

export function Badge({
  tone = 'neutral',
  className,
  children
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// 课程作业：提示条，用于成功/失败/警告等反馈。

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

const toneClasses: Record<AlertTone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800'
};

export function Alert({
  tone = 'info',
  title,
  children,
  className
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('rounded-lg border px-4 py-3 text-sm', toneClasses[tone], className)}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={cn(title ? 'mt-1' : '')}>{children}</div> : null}
    </div>
  );
}

// 课程作业：统一加载指示器。

import { cn } from '../../lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]'
};

export function Spinner({
  size = 'md',
  className
}: {
  size?: SpinnerSize;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="加载中"
      className={cn(
        'inline-block animate-spin rounded-full border-zinc-200 border-t-brand-600',
        sizeClasses[size],
        className
      )}
    />
  );
}

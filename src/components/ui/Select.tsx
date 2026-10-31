// 课程作业：统一下拉选择组件。

import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, className, containerClassName, children, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const message = error ?? hint;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label ? (
        <label htmlFor={selectId} className="block text-sm font-medium text-zinc-700">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'focus-ring h-10 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900',
          error ? 'border-red-400' : 'border-zinc-300',
          'disabled:cursor-not-allowed disabled:bg-zinc-50',
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {message ? (
        <p className={cn('text-xs', error ? 'text-red-600' : 'text-zinc-500')}>
          {message}
        </p>
      ) : null}
    </div>
  );
});

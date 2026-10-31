// 课程作业：统一表单输入组件，包含标签、提示与错误信息。

import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, containerClassName, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const message = error ?? hint;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-zinc-700">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'focus-ring h-10 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400',
          error ? 'border-red-400' : 'border-zinc-300',
          'disabled:cursor-not-allowed disabled:bg-zinc-50',
          className
        )}
        {...rest}
      />
      {message ? (
        <p className={cn('text-xs', error ? 'text-red-600' : 'text-zinc-500')}>
          {message}
        </p>
      ) : null}
    </div>
  );
});

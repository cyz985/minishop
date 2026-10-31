// 课程作业：统一多行文本输入组件。

import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, id, className, containerClassName, ...rest },
    ref
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const message = error ?? hint;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label ? (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-zinc-700"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'focus-ring w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
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
  }
);

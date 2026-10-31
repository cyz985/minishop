// 课程作业：通用分页控件，供商品/订单列表复用。

import { Button } from './Button';

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  disabled = false
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (nextPage: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const canPrev = current > 1 && !disabled;
  const canNext = current < totalPages && !disabled;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
      <p className="text-xs text-zinc-500">
        共 {total} 条，第 {current} / {totalPages} 页
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onChange(current - 1)}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onChange(current + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

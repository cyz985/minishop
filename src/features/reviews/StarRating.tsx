// 课程作业：星级评分展示/选择组件，评价功能复用。

export function StarRating({
  value,
  onChange
}: {
  value: number;
  onChange?: (nextValue: number) => void;
}) {
  if (!onChange) {
    return (
      <span
        aria-label={`${value} 星`}
        className="text-sm tracking-wide text-amber-500"
      >
        {'★'.repeat(Math.max(0, Math.min(5, Math.round(value))))}
        {'☆'.repeat(5 - Math.max(0, Math.min(5, Math.round(value))))}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} 星`}
          onClick={() => onChange(star)}
          className={`focus-ring text-xl leading-none ${
            star <= value ? 'text-amber-500' : 'text-zinc-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

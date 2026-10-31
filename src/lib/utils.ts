// 课程作业：通用工具函数。

/** 合并 className，避免引入额外依赖。 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** 商城金额统一按人民币展示。 */
export function formatCurrency(value: number | string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '¥0.00';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2
  }).format(amount);
}

/** 统一日期展示，避免各页面格式不一致。 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/** 生成安全的登录回跳地址。 */
export function buildLoginRedirect(pathname: string, search = ''): string {
  return `/login?redirect=${encodeURIComponent(pathname + search)}`;
}

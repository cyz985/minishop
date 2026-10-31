// 课程作业：把 Supabase/网络错误转换为用户可读的中文提示。
// 不直接暴露 SQL、堆栈或密钥。

interface ErrorLike {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function getErrorMessage(error: unknown): string {
  if (!error) return '操作失败，请稍后重试';

  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const value = error as ErrorLike;

    if (value.code === '42501') {
      return '当前账号没有执行此操作的权限';
    }

    if (value.message) {
      if (value.message.includes('Failed to fetch')) {
        return '网络连接失败，请检查网络后重试';
      }
      if (value.message.includes('JWT')) {
        return '登录状态已失效，请重新登录';
      }
      return value.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '操作失败，请稍后重试';
}

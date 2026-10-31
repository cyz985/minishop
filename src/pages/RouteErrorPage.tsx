// 课程作业：路由异常兜底页，避免路由错误导致白屏。

import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorState } from '../components/ui/ErrorState';

export function RouteErrorPage() {
  const error = useRouteError();

  let description = '页面加载过程中出现未知错误';
  if (isRouteErrorResponse(error)) {
    description = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    description = error.message;
  }

  return (
    <div className="container-page py-16">
      <ErrorState
        title="页面加载出错"
        description={description}
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}

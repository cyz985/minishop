// 课程作业：React 渲染异常边界，保证页面错误不造成白屏。

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './ui/ErrorState';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 作业环境不接入监控平台，保留控制台信息便于排查。
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container-page py-16">
          <ErrorState
            title="页面渲染失败"
            description={this.state.error.message}
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

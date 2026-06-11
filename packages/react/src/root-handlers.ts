import type { ErrorCatalog, PolicyEngine } from '@resilio/core';
import type { RootOptions } from 'react-dom/client';

export type ResilioRootHandlers = Required<
  Pick<RootOptions, 'onCaughtError' | 'onUncaughtError' | 'onRecoverableError'>
>;

/**
 * React 19 createRoot / hydrateRoot 옵션에 지정할 에러 관측성 핸들러를 생성합니다.
 * 이를 통해 렌더링 중 발생하는 예외 및 hydration 경고 에러 등을 전역 Resilio 채널로 포워딩합니다.
 */
export function createResilioRootHandlers<T extends ErrorCatalog>(
  engine: PolicyEngine<T>
): ResilioRootHandlers {
  return {
    onCaughtError: (error, errorInfo) => {
      engine.reportException(error, { componentStack: errorInfo.componentStack }, 'react.caught');
    },
    onUncaughtError: (error, errorInfo) => {
      engine.reportException(error, { componentStack: errorInfo.componentStack }, 'react.uncaught');
    },
    onRecoverableError: (error, errorInfo) => {
      engine.reportException(error, { componentStack: errorInfo.componentStack }, 'react.recoverable');
    },
  };
}

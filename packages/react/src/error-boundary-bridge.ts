import { useReportError } from './useResilio.js';

/**
 * react-error-boundary 라이브러리와 Resilio를 연동하기 위한 custom hook입니다.
 * React Error Boundary가 포착한 예외를 Resilio Telemetry로 즉시 전송합니다.
 * 
 * @example
 * ```tsx
 * import { ErrorBoundary } from 'react-error-boundary';
 * import { useResilioErrorBoundaryHandler } from '@resilio/react';
 * 
 * function App() {
 *   const handleError = useResilioErrorBoundaryHandler();
 *   return (
 *     <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
 *       <MyComponent />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 */
export function useResilioErrorBoundaryHandler(
  context?: Record<string, unknown>
) {
  const report = useReportError();

  return (error: Error, info: { componentStack?: string | null }) => {
    report.exception(error, {
      source: 'react.caught',
      context: {
        componentStack: info.componentStack,
        ...context,
      },
    });
  };
}

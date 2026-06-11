'use client';

import { useContext, useEffect } from 'react';
import type { ErrorSource } from '@resilio/core';
import { ResilioContext } from './ResilioProvider.js';
import type { ExceptionReporter } from './capture.js';

export interface BrowserErrorBridgeOptions {
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

export function installResilioBrowserErrorBridge(
  report: ExceptionReporter,
  options: BrowserErrorBridgeOptions = {},
): () => void {
  const target = options.target ?? window;
  const onError = (event: Event) => {
    const errorEvent = event as ErrorEvent;
    report(errorEvent.error ?? errorEvent.message, {
      source: 'browser.error',
      context: {
        filename: errorEvent.filename,
        line: errorEvent.lineno,
        column: errorEvent.colno,
      },
    });
  };
  const onUnhandledRejection = (event: Event) => {
    report((event as PromiseRejectionEvent).reason, {
      source: 'browser.unhandledrejection',
    });
  };

  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}

export function useResilioBrowserErrorBridge(): void {
  const context = useContext(ResilioContext);

  useEffect(() => {
    if (!context?.engine) return;
    return installResilioBrowserErrorBridge((error, options) => {
      context.engine?.reportException(
        error,
        options?.context,
        options?.source as ErrorSource | undefined,
        options?.correlationId,
      );
    });
  }, [context?.engine]);
}

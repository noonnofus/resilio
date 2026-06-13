// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  installResilioBrowserErrorBridge,
  type BrowserErrorBridgeOptions,
} from './browser-error-bridge.js';

describe('installResilioBrowserErrorBridge', () => {
  it('reports global errors and unhandled rejections and removes its listeners', () => {
    const report = vi.fn();
    const target = new EventTarget();
    const cleanup = installResilioBrowserErrorBridge(report, {
      target: target as BrowserErrorBridgeOptions['target'],
    });
    const error = new Error('global failed');

    const errorEvent = Object.assign(new Event('error'), {
      error,
      message: error.message,
      filename: '/app.js',
      lineno: 10,
      colno: 2,
    }) as ErrorEvent;
    target.dispatchEvent(errorEvent);
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejection, 'reason', { value: error });
    target.dispatchEvent(rejection);

    expect(report).toHaveBeenNthCalledWith(1, error, expect.objectContaining({
      source: 'browser.error',
    }));
    expect(report).toHaveBeenNthCalledWith(2, error, {
      source: 'browser.unhandledrejection',
    });

    cleanup();
    target.dispatchEvent(errorEvent);
    expect(report).toHaveBeenCalledTimes(2);
  });
});

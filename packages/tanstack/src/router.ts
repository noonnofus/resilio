import type { PresentationContext } from '@resiliojs/core';
import {
  dispatchTanStackError,
  type TanStackPresentationOptions,
} from './shared.js';

export interface ResilioRouterOptions extends TanStackPresentationOptions {
  context?: Omit<PresentationContext, 'source'>;
  isNotFound?: (error: unknown) => boolean;
}

export function createResilioRouterErrorHandler(
  options: ResilioRouterOptions,
): (error: unknown) => void {
  return (error) => {
    if (options.isNotFound?.(error)) return;
    dispatchTanStackError(error, {
      ...options.context,
      source: 'router',
    }, options);
  };
}

export interface ResilioRouterLifecycle {
  onError(error: unknown): void;
  onCatch(error: unknown): void;
  presentError(error: unknown): void;
}

export function createResilioRouterLifecycle(
  options: ResilioRouterOptions,
): ResilioRouterLifecycle {
  const handle = createResilioRouterErrorHandler(options);
  return {
    onError: handle,
    onCatch: handle,
    presentError: handle,
  };
}

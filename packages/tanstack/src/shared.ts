import type { PresentationContext } from '@resiliojs/core';

export type TanStackPresent = (
  input: unknown,
  context: PresentationContext,
) => Promise<readonly unknown[] | null> | readonly unknown[] | null;

export type TanStackExceptionReporter = (
  error: unknown,
  context: PresentationContext,
) => void;

export interface TanStackPresentationOptions {
  present: TanStackPresent;
  reportException?: TanStackExceptionReporter;
}

export function dispatchTanStackError(
  error: unknown,
  context: PresentationContext,
  options: TanStackPresentationOptions,
): void {
  void Promise.resolve(options.present(error, context))
    .then((result) => {
      if (result === null) {
        options.reportException?.(error, context);
      }
    })
    .catch((adapterError) => {
      options.reportException?.(adapterError, context);
    });
}

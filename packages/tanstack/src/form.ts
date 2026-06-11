import type {
  ErrorCatalog,
  PresentationContext,
  PresentationDecision,
  PresentationEvaluator,
} from '@resilio/core';

export interface TanStackFormError {
  form?: string;
  fields?: Record<string, string>;
}

export interface ResilioFormMapperOptions<
  TCatalog extends ErrorCatalog,
  TChannel extends string,
> {
  evaluator: PresentationEvaluator<TCatalog, TChannel>;
  context?: Omit<PresentationContext, 'source'>;
  message?: (decision: PresentationDecision<TChannel>) => string;
}

export function createResilioFormErrorMapper<
  TCatalog extends ErrorCatalog,
  TChannel extends string,
>({
  evaluator,
  context,
  message = (decision) => decision.messageKey,
}: ResilioFormMapperOptions<TCatalog, TChannel>) {
  return async (error: unknown): Promise<TanStackFormError | undefined> => {
    const result = await evaluator.evaluateUnknown(error, {
      ...context,
      source: 'form',
    });
    if (result.kind !== 'plan') return undefined;

    const output: TanStackFormError = {};
    for (const { decision, status } of result.decisions) {
      if (status === 'suppressed' || decision.channel === 'silent') continue;
      if (decision.channel === 'inline' && decision.target) {
        output.fields ??= {};
        output.fields[decision.target] = message(decision);
      } else {
        output.form ??= message(decision);
      }
    }
    return output.form || output.fields ? output : undefined;
  };
}

export interface ResilioFormValidatorOptions<
  TValue,
  TCatalog extends ErrorCatalog,
  TChannel extends string,
> extends ResilioFormMapperOptions<TCatalog, TChannel> {
  validate(value: TValue): unknown | Promise<unknown>;
}

export function createResilioFormValidator<
  TValue,
  TCatalog extends ErrorCatalog,
  TChannel extends string,
>(options: ResilioFormValidatorOptions<TValue, TCatalog, TChannel>) {
  const map = createResilioFormErrorMapper(options);
  return async ({ value }: { value: TValue }): Promise<TanStackFormError | undefined> => {
    const error = await options.validate(value);
    return error == null ? undefined : map(error);
  };
}

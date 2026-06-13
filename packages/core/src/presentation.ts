import {
  BoundedDedupeStore,
  canonicalStringify,
  decodePublicError,
  stringHash,
  type DecodeFailureReason,
  type ErrorCatalog,
  type ParamsOf,
  type PublicError,
} from './error.js';

export type BuiltInChannel = 'inline' | 'toast' | 'modal' | 'banner' | 'silent';

export interface PresentationContext {
  source: string;
  surface?: string;
  locale?: string;
  interaction?: 'foreground' | 'background';
  scopeKey?: string;
  metadata?: Record<string, unknown>;
}

export interface PresentationDecision<
  TChannel extends string = BuiltInChannel,
  TPayload = unknown,
> {
  channel: TChannel;
  severity: 'info' | 'warning' | 'error';
  messageKey: string;
  messageArgs?: Record<string, string | number | boolean>;
  target?: string;
  dedupeKey?: string;
  dedupeWindowMs?: number;
  correlationId?: string;
  payload?: TPayload;
}

export interface PresentationPlan<TChannel extends string = BuiltInChannel> {
  occurrenceId: string;
  primary: PresentationDecision<TChannel>;
  supplements?: readonly PresentationDecision<TChannel>[];
}

export type PresentationPlanInput<TChannel extends string = BuiltInChannel> =
  | PresentationDecision<TChannel>
  | {
      primary: PresentationDecision<TChannel>;
      supplements?: readonly PresentationDecision<TChannel>[];
    };

export interface PresentationRule<P, TChannel extends string = BuiltInChannel> {
  when?: (context: PresentationContext) => boolean;
  decide: (input: {
    error: { code: string; params: P };
    context: PresentationContext;
  }) => PresentationPlanInput<TChannel>;
}

export type PresentationPolicyConfig<
  TCatalog extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
> = {
  [C in keyof TCatalog & string]: readonly PresentationRule<ParamsOf<TCatalog[C]>, TChannel>[];
};

export interface EvaluatedPresentationDecision<TChannel extends string = BuiltInChannel> {
  decision: PresentationDecision<TChannel>;
  status: 'dispatch' | 'suppressed';
}

export type PresentationInvalidReason = DecodeFailureReason | 'invalid_plan';

export type PresentationEvaluationResult<
  TCatalog extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
> =
  | {
      kind: 'plan';
      plan: PresentationPlan<TChannel>;
      decisions: readonly EvaluatedPresentationDecision<TChannel>[];
      error: PublicError<TCatalog>;
    }
  | { kind: 'invalid'; reason: PresentationInvalidReason };

export interface PresentationEvaluator<
  TCatalog extends ErrorCatalog = ErrorCatalog,
  TChannel extends string = BuiltInChannel,
> {
  evaluateUnknown(
    input: unknown,
    context: PresentationContext,
  ): Promise<PresentationEvaluationResult<TCatalog, TChannel>>;
}

export type PresentationObservationEvent<
  TCatalog extends ErrorCatalog = ErrorCatalog,
  TChannel extends string = BuiltInChannel,
> =
  | {
      kind: 'decision';
      occurrenceId: string;
      status: 'dispatch' | 'suppressed';
      decision: PresentationDecision<TChannel>;
      error: PublicError<TCatalog>;
      context: PresentationContext;
    }
  | {
      kind: 'invalid';
      reason: PresentationInvalidReason;
      context: PresentationContext;
    };

export type PresentationObserver<
  TCatalog extends ErrorCatalog = ErrorCatalog,
  TChannel extends string = BuiltInChannel,
> = (
  event: PresentationObservationEvent<TCatalog, TChannel>,
) => void | Promise<void>;

export interface PresentationEvaluatorOptions<
  TCatalog extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
> {
  catalog: TCatalog;
  policy: PresentationPolicyConfig<TCatalog, TChannel>;
  fallback: (
    error: PublicError<TCatalog>,
    context: PresentationContext,
  ) => PresentationPlanInput<TChannel>;
  dedupeStore?: BoundedDedupeStore;
  now?: () => number;
  idProvider?: () => string;
  interruptiveChannels?: readonly TChannel[];
  observer?: PresentationObserver<TCatalog, TChannel>;
}

export function definePresentationPolicy<
  TCatalog extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
>(
  _catalog: TCatalog,
  policy: PresentationPolicyConfig<TCatalog, TChannel>,
): PresentationPolicyConfig<TCatalog, TChannel> {
  return policy;
}

export function createPresentationPlan<TChannel extends string = BuiltInChannel>(
  primary: PresentationDecision<TChannel>,
  supplements?: readonly PresentationDecision<TChannel>[],
): Omit<PresentationPlan<TChannel>, 'occurrenceId'> {
  return { primary, supplements };
}

export function createPresentationEvaluator<
  TCatalog extends ErrorCatalog,
  TChannel extends string = BuiltInChannel,
>({
  catalog,
  policy,
  fallback,
  dedupeStore = new BoundedDedupeStore(),
  now = Date.now,
  idProvider = () => Math.random().toString(36).slice(2),
  interruptiveChannels = ['modal', 'toast'] as unknown as readonly TChannel[],
  observer,
}: PresentationEvaluatorOptions<TCatalog, TChannel>): PresentationEvaluator<TCatalog, TChannel> {
  return {
    async evaluateUnknown(input, context) {
      const decoded = await decodePublicError(catalog, input);
      if (!decoded.ok) {
        notifyBestEffort(observer, {
          kind: 'invalid',
          reason: decoded.reason,
          context,
        });
        return { kind: 'invalid', reason: decoded.reason };
      }

      const error = decoded.value;
      const rules = policy[error.code] as readonly PresentationRule<unknown, TChannel>[];
      const rule = rules.find((candidate) => !candidate.when || candidate.when(context));
      const output = rule
        ? rule.decide({
            error: {
              code: error.code,
              params: 'params' in error ? error.params : undefined,
            },
            context,
          })
        : fallback(error, context);
      const plan = normalizePlan(output, idProvider());

      if (!isValidPlan(plan, interruptiveChannels)) {
        notifyBestEffort(observer, {
          kind: 'invalid',
          reason: 'invalid_plan',
          context,
        });
        return { kind: 'invalid', reason: 'invalid_plan' };
      }

      const decisions = [plan.primary, ...(plan.supplements ?? [])].map((decision) =>
        evaluateDecision(decision, error, context, dedupeStore, now()),
      );
      const [primary, ...supplements] = decisions.map(({ decision }) => decision);
      for (const evaluated of decisions) {
        notifyBestEffort(observer, {
          kind: 'decision',
          occurrenceId: plan.occurrenceId,
          status: evaluated.status,
          decision: evaluated.decision,
          error,
          context,
        });
      }

      return {
        kind: 'plan',
        plan: {
          occurrenceId: plan.occurrenceId,
          primary: primary as PresentationDecision<TChannel>,
          supplements: supplements.length > 0 ? supplements : undefined,
        },
        decisions,
        error,
      };
    },
  };
}

function notifyBestEffort<
  TCatalog extends ErrorCatalog,
  TChannel extends string,
>(
  observer: PresentationObserver<TCatalog, TChannel> | undefined,
  event: PresentationObservationEvent<TCatalog, TChannel>,
): void {
  if (!observer) return;
  try {
    void Promise.resolve(observer(event)).catch(() => undefined);
  } catch {
    // Observation must never alter policy evaluation or application control flow.
  }
}

function normalizePlan<TChannel extends string>(
  input: PresentationPlanInput<TChannel>,
  occurrenceId: string,
): PresentationPlan<TChannel> {
  if ('primary' in input) {
    return { occurrenceId, primary: input.primary, supplements: input.supplements };
  }
  return { occurrenceId, primary: input };
}

function isValidPlan<TChannel extends string>(
  plan: PresentationPlan<TChannel>,
  interruptiveChannels: readonly TChannel[],
): boolean {
  const interruptive = new Set<string>(interruptiveChannels);
  return [plan.primary, ...(plan.supplements ?? [])]
    .filter((decision) => interruptive.has(decision.channel))
    .length <= 1;
}

function evaluateDecision<TCatalog extends ErrorCatalog, TChannel extends string>(
  decision: PresentationDecision<TChannel>,
  error: PublicError<TCatalog>,
  context: PresentationContext,
  dedupeStore: BoundedDedupeStore,
  timestamp: number,
): EvaluatedPresentationDecision<TChannel> {
  if (!decision.dedupeWindowMs || decision.dedupeWindowMs <= 0) {
    return { decision, status: 'dispatch' };
  }

  const fingerprint =
    decision.dedupeKey ??
    [
      context.source,
      context.scopeKey ?? '',
      error.code,
      decision.channel,
      decision.target ?? '',
      stringHash(canonicalStringify('params' in error ? error.params : undefined)),
    ].join('::');
  const suppressed = dedupeStore.shouldSuppress(
    fingerprint,
    timestamp,
    decision.dedupeWindowMs,
  );

  return {
    decision: { ...decision, dedupeKey: fingerprint },
    status: suppressed ? 'suppressed' : 'dispatch',
  };
}

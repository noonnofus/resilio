import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import {
  createPresentationEvaluator,
  defineErrorCatalog,
  definePresentationPolicy,
} from './index.js';

const catalog = defineErrorCatalog({
  EMAIL_TAKEN: { params: z.object({ email: z.string().email() }) },
  RATE_LIMITED: { params: z.object({ retryAfter: z.number() }) },
});

const policy = definePresentationPolicy(catalog, {
  EMAIL_TAKEN: [
    {
      when: ({ surface }) => surface === 'signup-form',
      decide: ({ error }) => ({
        channel: 'inline',
        severity: 'warning',
        messageKey: 'errors.emailTaken',
        messageArgs: { email: error.params.email },
        target: 'email',
      }),
    },
  ],
  RATE_LIMITED: [
    {
      decide: () => ({
        channel: 'toast',
        severity: 'warning',
        messageKey: 'errors.rateLimited',
        dedupeWindowMs: 100,
      }),
    },
  ],
});

const fallback = () =>
  ({
    channel: 'modal',
    severity: 'error',
    messageKey: 'errors.fallback',
  }) as const;

describe('presentation evaluator', () => {
  it('decodes unknown input and evaluates a context-aware rule', async () => {
    const evaluator = createPresentationEvaluator({ catalog, policy, fallback });
    const result = await evaluator.evaluateUnknown(
      { code: 'EMAIL_TAKEN', params: { email: 'taken@example.com' } },
      { source: 'form', surface: 'signup-form' },
    );

    expect(result).toMatchObject({
      kind: 'plan',
      plan: {
        primary: { channel: 'inline', messageKey: 'errors.emailTaken', target: 'email' },
      },
      decisions: [{ status: 'dispatch' }],
    });
  });

  it('uses fallback when no scoped rule matches', async () => {
    const evaluator = createPresentationEvaluator({ catalog, policy, fallback });
    const result = await evaluator.evaluateUnknown(
      { code: 'EMAIL_TAKEN', params: { email: 'taken@example.com' } },
      { source: 'query', surface: 'profile' },
    );

    expect(result).toMatchObject({
      kind: 'plan',
      plan: { primary: { channel: 'modal', messageKey: 'errors.fallback' } },
    });
  });

  it('suppresses duplicate decisions without merging different params', async () => {
    let now = 1_000;
    const evaluator = createPresentationEvaluator({
      catalog,
      policy,
      fallback,
      now: () => now,
    });
    const first = await evaluator.evaluateUnknown(
      { code: 'RATE_LIMITED', params: { retryAfter: 1 } },
      { source: 'mutation' },
    );
    now += 1;
    const duplicate = await evaluator.evaluateUnknown(
      { code: 'RATE_LIMITED', params: { retryAfter: 1 } },
      { source: 'mutation' },
    );
    const distinct = await evaluator.evaluateUnknown(
      { code: 'RATE_LIMITED', params: { retryAfter: 2 } },
      { source: 'mutation' },
    );

    expect(first).toMatchObject({ kind: 'plan', decisions: [{ status: 'dispatch' }] });
    expect(duplicate).toMatchObject({ kind: 'plan', decisions: [{ status: 'suppressed' }] });
    expect(distinct).toMatchObject({ kind: 'plan', decisions: [{ status: 'dispatch' }] });
  });

  it('rejects invalid public payloads before policy evaluation', async () => {
    const evaluator = createPresentationEvaluator({ catalog, policy, fallback });
    await expect(
      evaluator.evaluateUnknown(
        { code: 'EMAIL_TAKEN', params: { email: 'invalid' }, stack: 'secret' },
        { source: 'network' },
      ),
    ).resolves.toEqual({ kind: 'invalid', reason: 'invalid_shape' });
  });

  it('evaluates primary and supplements independently under one occurrence', async () => {
    const multiPolicy = definePresentationPolicy(catalog, {
      EMAIL_TAKEN: [
        {
          decide: () => ({
            primary: {
              channel: 'inline',
              severity: 'warning',
              messageKey: 'errors.emailTaken',
              target: 'email',
            },
            supplements: [
              {
                channel: 'banner',
                severity: 'warning',
                messageKey: 'errors.formHasErrors',
              },
            ],
          }),
        },
      ],
      RATE_LIMITED: policy.RATE_LIMITED,
    });
    const evaluator = createPresentationEvaluator({
      catalog,
      policy: multiPolicy,
      fallback,
      idProvider: () => 'occurrence-1',
    });
    const result = await evaluator.evaluateUnknown(
      { code: 'EMAIL_TAKEN', params: { email: 'taken@example.com' } },
      { source: 'form' },
    );

    expect(result).toMatchObject({
      kind: 'plan',
      plan: {
        occurrenceId: 'occurrence-1',
        primary: { channel: 'inline' },
        supplements: [{ channel: 'banner' }],
      },
      decisions: [{ status: 'dispatch' }, { status: 'dispatch' }],
    });
  });

  it('rejects plans with more than one interruptive decision', async () => {
    const invalidPolicy = definePresentationPolicy(catalog, {
      EMAIL_TAKEN: [
        {
          decide: () => ({
            primary: {
              channel: 'modal',
              severity: 'error',
              messageKey: 'errors.primary',
            },
            supplements: [
              {
                channel: 'toast',
                severity: 'error',
                messageKey: 'errors.supplement',
              },
            ],
          }),
        },
      ],
      RATE_LIMITED: policy.RATE_LIMITED,
    });
    const evaluator = createPresentationEvaluator({ catalog, policy: invalidPolicy, fallback });

    await expect(
      evaluator.evaluateUnknown(
        { code: 'EMAIL_TAKEN', params: { email: 'taken@example.com' } },
        { source: 'form' },
      ),
    ).resolves.toEqual({ kind: 'invalid', reason: 'invalid_plan' });
  });

  it('suppresses one supplement without suppressing the rest of the plan', async () => {
    let now = 1_000;
    const multiPolicy = definePresentationPolicy(catalog, {
      EMAIL_TAKEN: [
        {
          decide: () => ({
            primary: {
              channel: 'inline',
              severity: 'warning',
              messageKey: 'errors.emailTaken',
              target: 'email',
            },
            supplements: [
              {
                channel: 'banner',
                severity: 'warning',
                messageKey: 'errors.formHasErrors',
                dedupeWindowMs: 100,
              },
            ],
          }),
        },
      ],
      RATE_LIMITED: policy.RATE_LIMITED,
    });
    const evaluator = createPresentationEvaluator({
      catalog,
      policy: multiPolicy,
      fallback,
      now: () => now,
    });
    const input = { code: 'EMAIL_TAKEN', params: { email: 'taken@example.com' } };
    await evaluator.evaluateUnknown(input, { source: 'form' });
    now += 1;
    const second = await evaluator.evaluateUnknown(input, { source: 'form' });

    expect(second).toMatchObject({
      kind: 'plan',
      decisions: [{ status: 'dispatch' }, { status: 'suppressed' }],
    });
  });

  it('observes dispatch, suppression, and invalid outcomes without exposing raw invalid input', async () => {
    let now = 1_000;
    const observer = vi.fn();
    const evaluator = createPresentationEvaluator({
      catalog,
      policy,
      fallback,
      now: () => now,
      idProvider: () => 'occurrence-1',
      observer,
    });
    const input = { code: 'RATE_LIMITED', params: { retryAfter: 1 } };

    await evaluator.evaluateUnknown(input, { source: 'query' });
    now += 1;
    await evaluator.evaluateUnknown(input, { source: 'query' });
    await evaluator.evaluateUnknown({ code: 'UNKNOWN', stack: 'secret' }, { source: 'query' });

    expect(observer).toHaveBeenNthCalledWith(1, expect.objectContaining({
      kind: 'decision',
      occurrenceId: 'occurrence-1',
      status: 'dispatch',
    }));
    expect(observer).toHaveBeenNthCalledWith(2, expect.objectContaining({
      kind: 'decision',
      status: 'suppressed',
    }));
    expect(observer).toHaveBeenNthCalledWith(3, {
      kind: 'invalid',
      reason: 'invalid_shape',
      context: { source: 'query' },
    });
    expect(observer.mock.calls[2]?.[0]).not.toHaveProperty('input');
  });

  it('isolates observer failures from policy evaluation', async () => {
    const evaluator = createPresentationEvaluator({
      catalog,
      policy,
      fallback,
      observer: () => { throw new Error('observer failed'); },
    });

    await expect(evaluator.evaluateUnknown(
      { code: 'RATE_LIMITED', params: { retryAfter: 1 } },
      { source: 'query' },
    )).resolves.toMatchObject({ kind: 'plan' });
  });
});

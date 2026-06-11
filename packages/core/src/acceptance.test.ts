import { describe, it, expect, vi } from 'vitest';
import * as z from 'zod';
import {
  canonicalStringify,
  createCompositeSink,
  defineErrorCatalog,
  createPublicError,
  decodePublicError,
  PolicyEngine,
  type ErrorSink,
} from './error.js';

describe('Resilio Error Policy Layer Acceptance Tests (§21)', () => {
  const catalog = defineErrorCatalog({
    RATE_LIMITED: {
      params: z.object({ retryAfter: z.number() }),
    },
    NO_PARAMS_ERROR: {},
  });

  type Catalog = typeof catalog;

  // TC-02: 동일 fingerprint burst -> UI 1회, Sink N회
  it('TC-02: should suppress UI feedback for duplicate bursts but report all events to the Sink', () => {
    const mockSink: ErrorSink<Catalog> = {
      report: vi.fn(),
    };

    const policy = {
      RATE_LIMITED: {
        feedback: 'toast' as const,
        dedupe: {
          windowMs: 1000, // 1초 동안 디두프
        },
        message: (params: { retryAfter: number }) => `Too many requests. Retry after ${params.retryAfter}s.`,
      },
      NO_PARAMS_ERROR: {
        feedback: 'silent' as const,
        message: 'No params error',
      },
    };

    const engine = new PolicyEngine({
      catalog,
      policy,
      sink: mockSink,
    });

    const error = createPublicError(catalog, 'RATE_LIMITED', { retryAfter: 10 });

    // 10회 에러를 연달아 발생시킴
    const decisions = [];
    for (let i = 0; i < 10; i++) {
      decisions.push(engine.reportPublic(error, {}, 'manual'));
    }

    // 첫 번째 결정은 suppressed: false 여야 함 (UI 노출)
    expect(decisions[0].suppressed).toBe(false);
    
    // 나머지 9개 결정은 suppressed: true 여야 함 (UI 중복 노출 차단)
    for (let i = 1; i < 10; i++) {
      expect(decisions[i].suppressed).toBe(true);
    }

    // Sink 에는 10회 모두 보고되었는지 확인 (관측성은 온전히 N회 기록)
    expect(mockSink.report).toHaveBeenCalledTimes(10);
  });

  // TC-04: PublicError에 stack/원본 미포함 검증 (보안 Invariant)
  it('TC-04: should ensure PublicError does not expose internal stack trace or raw error message details', () => {
    const error = createPublicError(catalog, 'RATE_LIMITED', { retryAfter: 5 });

    // PublicError의 규격상 code, params, correlationId만 존재하고 stack이나 raw message, name, cause 등은 존재하지 않아야 함
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('params');
    
    // 보안 민감 속성 부재 단언
    expect(error).not.toHaveProperty('stack');
    expect(error).not.toHaveProperty('message');
    expect(error).not.toHaveProperty('name');
    expect(error).not.toHaveProperty('cause');
    
    // 정확한 키 규격만 가지고 있는지 확인
    const keys = Object.keys(error);
    expect(keys.every(k => ['code', 'params', 'correlationId'].includes(k))).toBe(true);
  });

  // TC-08: 프로세스 독립 decode/policy 동작
  it('TC-08: should decode serialized network payload correctly and evaluate policy in isolation', async () => {
    const originalError = createPublicError(catalog, 'RATE_LIMITED', { retryAfter: 30 });
    
    // 1. 네트워크 통신을 거친 JSON 직렬화/역직렬화 모방 (물리적 프로세스 경계)
    const jsonPayload = JSON.stringify(originalError);
    const parsedPayload = JSON.parse(jsonPayload);

    // 2. 다른 런타임/프로세스로 가정하고 디코더 수행
    const decodeResult = await decodePublicError(catalog, parsedPayload);
    expect(decodeResult.ok).toBe(true);

    if (decodeResult.ok) {
      const decodedError = decodeResult.value;
      
      // 타입 좁히기가 정상적으로 동작하는지 단언
      expect(decodedError.code).toBe('RATE_LIMITED');
      if (decodedError.code === 'RATE_LIMITED') {
        expect(decodedError.params.retryAfter).toBe(30);
      } else {
        throw new Error('Expected code to be RATE_LIMITED');
      }

      // 3. 디코딩된 에러가 PolicyEngine에서 동일하게 평가되는지 확인
      const policy = {
        RATE_LIMITED: {
          feedback: 'toast' as const,
          message: (params: { retryAfter: number }) => `Wait ${params.retryAfter} seconds`,
        },
        NO_PARAMS_ERROR: {
          feedback: 'silent' as const,
          message: 'Silent error',
        },
      };

      const engine = new PolicyEngine({ catalog, policy });
      const decision = engine.reportPublic(decodedError);

      expect(decision.feedback).toBe('toast');
      expect(decision.message).toBe('Wait 30 seconds');
    }
  });

  it('rejects malformed and sensitive public error payloads at the network boundary', async () => {
    await expect(decodePublicError(catalog, {
      code: 'NO_PARAMS_ERROR',
      correlationId: { unsafe: true },
    })).resolves.toEqual({ ok: false, reason: 'invalid_shape' });

    await expect(decodePublicError(catalog, {
      code: 'NO_PARAMS_ERROR',
      stack: 'sensitive stack',
    })).resolves.toEqual({ ok: false, reason: 'invalid_shape' });

    await expect(decodePublicError(catalog, {
      code: 'NO_PARAMS_ERROR',
      params: {},
    })).resolves.toEqual({ ok: false, reason: 'invalid_params' });
  });

  it('keeps telemetry failures best-effort', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rejectingSink: ErrorSink<Catalog> = {
      report: async () => {
        throw new Error('sink unavailable');
      },
    };
    const healthySink: ErrorSink<Catalog> = {
      report: vi.fn(),
    };

    const composite = createCompositeSink([rejectingSink, healthySink]);
    const engine = new PolicyEngine({
      catalog,
      policy: {
        RATE_LIMITED: {
          feedback: 'toast',
          message: 'Rate limited',
        },
        NO_PARAMS_ERROR: {
          feedback: 'silent',
          message: 'No params error',
        },
      },
      sink: composite,
    });

    expect(() => engine.reportPublic(createPublicError(catalog, 'NO_PARAMS_ERROR'))).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(healthySink.report).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('produces distinct canonical values for distinct parameter types', () => {
    expect(canonicalStringify({ value: 1 })).not.toBe(canonicalStringify({ value: '1' }));
    expect(canonicalStringify({ value: null })).not.toBe(canonicalStringify({ value: undefined }));
    expect(canonicalStringify({ value: new Date('2020-01-01') }))
      .not.toBe(canonicalStringify({ value: new Date('2021-01-01') }));
    expect(canonicalStringify({ a: 1, b: 2 })).toBe(canonicalStringify({ b: 2, a: 1 }));
  });
});

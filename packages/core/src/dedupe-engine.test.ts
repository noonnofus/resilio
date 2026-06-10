import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  defineErrorCatalog,
  defineErrorPolicy,
  PolicyEngine,
  createPublicError,
  decodePublicError,
  canonicalStringify,
  stringHash,
  ErrorSink,
  ErrorEvent
} from './error.js';

const testCatalog = defineErrorCatalog({
  BURST_TEST: { params: z.object({ id: z.number(), val: z.string() }) },
  VALIDATION_TEST: { params: z.object({ email: z.string().email() }) },
});

const testPolicy = defineErrorPolicy(testCatalog, {
  BURST_TEST: {
    feedback: 'toast',
    severity: 'error',
    message: (p) => `ID ${p.id}: ${p.val}`,
    dedupe: { windowMs: 100 },
  },
  VALIDATION_TEST: {
    feedback: 'inline',
    severity: 'warning',
    message: 'Invalid email format',
  },
});

describe('PolicyEngine - Dedupe and Validation QA Matrix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // TC-02: 동일 fingerprint 5회 발생 시 UI feedback 1회, 나머지 suppressed, Sink는 5개 모두 수신
  it('TC-02: should trigger UI feedback once but record all events to Sink under same fingerprint within windowMs', async () => {
    const reports: ErrorEvent<any>[] = [];
    const mockSink: ErrorSink<any> = {
      report: (event) => {
        reports.push(event);
      },
    };

    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
      sink: mockSink,
    });

    const errorPayload = createPublicError(testCatalog, 'BURST_TEST', { id: 1, val: 'burst' });

    const decisions = [];
    for (let i = 0; i < 5; i++) {
      decisions.push(engine.reportPublic(errorPayload, undefined, 'manual', 'action-1'));
    }

    // UI Feedback (toast)은 첫 1회만 suppression: false이고 나머지는 true
    expect(decisions[0].suppressed).toBe(false);
    expect(decisions[1].suppressed).toBe(true);
    expect(decisions[2].suppressed).toBe(true);
    expect(decisions[3].suppressed).toBe(true);
    expect(decisions[4].suppressed).toBe(true);

    // Sink 에는 5번의 발생 기록이 모두 도달
    expect(reports.length).toBe(5);
    reports.forEach((evt) => {
      expect(evt.kind).toBe('public');
      if (evt.kind === 'public') {
        expect(evt.error.code).toBe('BURST_TEST');
      }
    });
  });

  // TC-03: 동일 code라도 params, field, scopeKey 중 하나가 다르면 서로 억제하지 않음
  it('TC-03: should not suppress if params, field, or scopeKey differ', () => {
    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
    });

    // 1. params 가 다름
    const errA = createPublicError(testCatalog, 'BURST_TEST', { id: 1, val: 'burst' });
    const errB = createPublicError(testCatalog, 'BURST_TEST', { id: 2, val: 'burst' });

    const decA = engine.reportPublic(errA, undefined, 'manual', 'action-1');
    const decB = engine.reportPublic(errB, undefined, 'manual', 'action-1');

    expect(decA.suppressed).toBe(false);
    expect(decB.suppressed).toBe(false);

    // 2. scopeKey 가 다름
    const decA2 = engine.reportPublic(errA, undefined, 'manual', 'action-2');
    expect(decA2.suppressed).toBe(false);
  });

  // TC-04: decoder가 부적합 payload를 거부
  it('TC-04: should reject invalid payloads in decodePublicError', async () => {
    // 1. 없는 code 수신 시 unknown_code 반환
    const decUnknown = await decodePublicError(testCatalog, { code: 'UNKNOWN_CODE' });
    expect(decUnknown.ok).toBe(false);
    if (!decUnknown.ok) {
      expect(decUnknown.reason).toBe('unknown_code');
    }

    // 2. schema spec에 어긋난 params 수신 시 invalid_params 반환
    const decInvalidParams = await decodePublicError(testCatalog, {
      code: 'BURST_TEST',
      params: { id: 'should_be_number', val: 'burst' },
    });
    expect(decInvalidParams.ok).toBe(false);
    if (!decInvalidParams.ok) {
      expect(decInvalidParams.reason).toBe('invalid_params');
    }

    // 3. 올바른 payload는 정상 통과
    const decOk = await decodePublicError(testCatalog, {
      code: 'BURST_TEST',
      params: { id: 123, val: 'valid' },
    });
    expect(decOk.ok).toBe(true);
    if (decOk.ok) {
      expect(decOk.value.code).toBe('BURST_TEST');
      expect(decOk.value.params).toEqual({ id: 123, val: 'valid' });
    }
  });

  // 20.2: 동일 fingerprint 100개를 Promise.all과 연속 microtask로 보고해도 UI feedback은 1회 (동기 burst race check)
  it('20.2: should suppress 100 concurrent reports to 1 UI feedback via synchronous check-and-set', async () => {
    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
    });

    const errorPayload = createPublicError(testCatalog, 'BURST_TEST', { id: 99, val: 'race' });

    const promises = Array.from({ length: 100 }).map(async () => {
      // JavaScript 동기 실행 구간에서 즉시 shouldSuppress가 체크 및 기록되므로 await가 섞여있지 않음
      return engine.reportPublic(errorPayload, undefined, 'manual', 'action-1');
    });

    const results = await Promise.all(promises);
    const unsuppressed = results.filter((r) => !r.suppressed);

    expect(unsuppressed.length).toBe(1);
    expect(results.filter((r) => r.suppressed).length).toBe(99);
  });

  // 20.2: canonical serializer는 객체 key 순서와 무관하게 동일 hash를 만든다
  it('20.2: canonical serializer should be key-order independent', () => {
    const objA = { z: 1, a: { y: 2, x: 3 } };
    const objB = { a: { x: 3, y: 2 }, z: 1 };

    const strA = canonicalStringify(objA);
    const strB = canonicalStringify(objB);

    expect(strA).toBe(strB);
    expect(stringHash(strA)).toBe(stringHash(strB));
  });
});

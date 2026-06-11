import { expectTypeOf } from 'expect-type';
import * as z from 'zod';
import {
  defineErrorCatalog,
  createPublicError,
  type PublicError,
  type ErrorPolicyConfig,
  defineErrorPolicy,
} from './error.js';

// 1. 임시 테스트용 카탈로그 생성
const testCatalog = defineErrorCatalog({
  NO_PARAMS: {},
  WITH_PARAMS: {
    params: z.object({
      id: z.string(),
      count: z.number(),
    }),
  },
});

type TestCatalog = typeof testCatalog;

// 2. PublicError 타입 매칭 검증
expectTypeOf<PublicError<TestCatalog>>().toEqualTypeOf<
  | { code: 'NO_PARAMS'; params?: never; correlationId?: string }
  | { code: 'WITH_PARAMS'; params: { id: string; count: number }; correlationId?: string }
>();

// 3. createPublicError 사용성 검증 (정상 사례)
const err1 = createPublicError(testCatalog, 'NO_PARAMS');
expectTypeOf(err1).toEqualTypeOf<PublicError<TestCatalog>>();

const err2 = createPublicError(testCatalog, 'WITH_PARAMS', { id: 'abc', count: 10 });
expectTypeOf(err2).toEqualTypeOf<PublicError<TestCatalog>>();

// 4. Compile-fail 검증 (컴파일 실패해야 하는 사례들)
// @ts-expect-error - 존재하지 않는 코드 사용 시 에러 발생해야 함
createPublicError(testCatalog, 'INVALID_CODE');

// @ts-expect-error - 파라미터가 필요한 코드인데 누락했을 때 에러 발생해야 함
createPublicError(testCatalog, 'WITH_PARAMS');

// @ts-expect-error - 파라미터 타입이 잘못되었을 때 에러 발생해야 함
createPublicError(testCatalog, 'WITH_PARAMS', { id: 123, count: 'ten' });

// @ts-expect-error - 파라미터가 없어야 하는 코드인데 전달했을 때 에러 발생해야 함
createPublicError(testCatalog, 'NO_PARAMS', { some: 'value' });


// 5. ErrorPolicyConfig Exhaustive 검증
// @ts-expect-error - 카탈로그의 코드가 하나라도 누락되면 에러가 발생해야 함 (Exhaustive 정책)
const invalidPolicy: ErrorPolicyConfig<TestCatalog> = {
  NO_PARAMS: {
    feedback: 'toast',
    message: 'No params error',
  },
};

// 정상 정책 정의
const validPolicy = defineErrorPolicy(testCatalog, {
  NO_PARAMS: {
    feedback: 'toast',
    message: 'No params error',
  },
  WITH_PARAMS: {
    feedback: 'inline',
    message: (params) => `Params error: ${params.id} (${params.count})`,
  },
});

// 정책에 정의된 파라미터 타입이 실제 카탈로그 스키마와 불일치할 때 에러 발생해야 함
const invalidPolicyParams = defineErrorPolicy(testCatalog, {
  NO_PARAMS: {
    feedback: 'toast',
    message: 'No params error',
  },
  WITH_PARAMS: {
    feedback: 'inline',
    // params.count가 number인데 string으로 접근하려는 등 타입 에러 검출
    message: (params) => {
      expectTypeOf(params.count).toEqualTypeOf<number>();
      // @ts-expect-error - count는 number이므로 string method 사용 시 에러 발생
      return params.count.toUpperCase();
    },
  },
});

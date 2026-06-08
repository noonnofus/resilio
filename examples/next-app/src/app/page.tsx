'use client';

import React, { useActionState, useEffect } from 'react';
import { updateProfile, triggerToastError, triggerUnexpectedError } from './actions';
import { useResilio, ResilioBoundary } from '@resilio/react';
import { toActionState } from '@resilio/next';

function BuggyComponent() {
  const [shouldCrash, setShouldCrash] = React.useState(false);

  if (shouldCrash) {
    throw new Error('This is a render-time crash!');
  }

  return (
    <div className="p-4 border border-dashed border-gray-400 rounded">
      <p className="text-sm text-gray-600 mb-2">렌더링 시 발생하는 에러를 테스트합니다.</p>
      <button
        onClick={() => setShouldCrash(true)}
        className="px-3 py-1 bg-red-600 text-white rounded text-sm"
      >
        렌더 붕괴 유발하기
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    toActionState<{ message: string } | null>(null)
  );

  const [toastState, toastFormAction, toastPending] = useActionState(
    triggerToastError,
    toActionState<null>(null)
  );

  const [unexpectedState, unexpectedFormAction, unexpectedPending] = useActionState(
    triggerUnexpectedError,
    toActionState<null>(null)
  );

  const { report } = useResilio();

  useEffect(() => {
    if (toastState && !toastState.ok) {
      report(toastState.error);
    }
  }, [toastState, report]);

  return (
    <main className="max-w-2xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">Resilio 에러 핸들링 데모</h1>

      <section className="mb-8 p-6 bg-white rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">1. Validation 실패 (Inline 에러 표시)</h2>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              name="name"
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="2글자 이상 입력"
            />
            {state && !state.ok && state.error.fields?.name?.[0] && (
              <p className="mt-1 text-sm text-red-600 font-medium">{state.error.fields.name[0]}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? '저장 중...' : '프로필 저장'}
          </button>
        </form>
        {state && state.ok && state.data && (
          <p className="mt-4 text-green-600 font-medium">{state.data.message}</p>
        )}
      </section>

      <section className="mb-8 p-6 bg-white rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">2. Toast 에러 데모</h2>
        <p className="text-sm text-gray-600 mb-4">서버 액션에서 발생한 Expected 에러를 브라우저 alert/custom toast로 연결합니다.</p>
        <form action={toastFormAction}>
          <button
            type="submit"
            disabled={toastPending}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
          >
            {toastPending ? '요청 중...' : '토스트 에러 유발'}
          </button>
        </form>
      </section>

      <section className="mb-8 p-6 bg-white rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">3. Unexpected 런타임 오류 (error.tsx)</h2>
        <p className="text-sm text-gray-600 mb-4">서버 액션에서 DB 장애 같은 Unexpected throw가 발생하면, Next.js의 `error.tsx` 바운더리로 흘러갑니다.</p>
        <form action={unexpectedFormAction}>
          <button
            type="submit"
            disabled={unexpectedPending}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {unexpectedPending ? '요청 중...' : 'Unexpected 에러 발생시키기'}
          </button>
        </form>
      </section>

      <section className="mb-8 p-6 bg-white rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">4. ResilioBoundary (React Error Boundary)</h2>
        <ResilioBoundary
          fallback={({ error, reset }) => (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 font-medium">컴포넌트 렌더링 중 오류가 잡혔습니다!</p>
              <p className="text-sm text-red-600 mt-1">{error.message}</p>
              <button
                onClick={reset}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                다시 시도
              </button>
            </div>
          )}
        >
          <BuggyComponent />
        </ResilioBoundary>
      </section>
    </main>
  );
}

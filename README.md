# Resilio

React & Next.js 환경에서 파편화된 에러 처리 흐름을 하나의 일관된 타입/API로 통합하고 관리하는 Headless 에러 핸들링 라이브러리입니다.

---

## 💡 에러 처리 원칙

Resilio는 **Expected Error(예상된 실패)**와 **Unexpected Error(예기치 못한 실패)**를 명확히 구분하여 처리합니다.

| 구분 | 예시 | 처리 방식 |
| --- | --- | --- |
| **Expected error** | validation 실패, 권한 없음, 비즈니스 규칙 위반 | `err(...)` 반환 후 UI state로 표시 |
| **Unexpected error** | 코드 버그, DB 연결 실패, 알 수 없는 런타임 오류 | throw 후 Error Boundary 또는 `error.tsx`로 처리 |
| **Retryable error** | 네트워크 timeout, 429, 503 | 정책에 따라 retry metadata 부여 및 재시도 |

> [!IMPORTANT]
> **보안 주의사항**  
> 서버 오류 원문과 stack trace는 민감한 정보를 포함하고 있을 가능성이 높으므로, 절대로 클라이언트에 그대로 노출하거나 직렬화 반환값에 포함하지 마십시오.

---

## 📦 패키지 구조

Resilio는 Monorepo 기반으로 설계되어 있습니다.

- **`@resilio/core`**: 프레임워크 독립적인 순수 TypeScript 코어. 에러 분류, 로깅, 재시도 유틸리티.
- **`@resilio/react`**: React 어댑터. Context Provider, Hooks, Error Boundary.
- **`@resilio/next`**: Next.js App Router & Server Action 어댑터.

---

## 🚀 Quick Start

### 1. 설치

사용하시는 패키지 매니저로 필요한 패키지를 설치합니다.

```bash
# React 프로젝트
npm install @resilio/core @resilio/react

# Next.js 프로젝트
npm install @resilio/core @resilio/react @resilio/next
```

---

### 2. React Quick Start

#### Provider 설정
애플리케이션 루트에 `ResilioProvider`를 감싸서 발생한 에러를 전역적으로 수집하고 토스트/로거와 연동합니다.

```tsx
// app/providers.tsx (Next.js) 또는 main.tsx (React)
'use client';

import { ResilioProvider } from '@resilio/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ResilioProvider
      onError={(error) => {
        // 전역 에러 로깅 (예: Sentry, Console)
        console.error('[Resilio Log]', error);
      }}
      onUserFacingError={(error) => {
        // 토스트/모달 UI 연동
        alert(`[에러 발생] ${error.message}`);
      }}
    >
      {children}
    </ResilioProvider>
  );
}
```

#### Event Handler 에러 보고
```tsx
import { useResilio } from '@resilio/react';

export function MyComponent() {
  const { report } = useResilio();

  const handleAction = async () => {
    try {
      await saveSomething();
    } catch (error) {
      // 비동기 에러를 Resilio 에러 처리 흐름으로 보고
      report(error);
    }
  };

  return <button onClick={handleAction}>실행</button>;
}
```

#### React Error Boundary
```tsx
import { ResilioBoundary } from '@resilio/react';

function App() {
  return (
    <ResilioBoundary
      fallback={({ error, reset }) => (
        <div>
          <p>렌더링 중 오류가 발생했습니다: {error.message}</p>
          <button onClick={reset}>다시 시도</button>
        </div>
      )}
    >
      <BuggyComponent />
    </ResilioBoundary>
  );
}
```

---

### 3. Next.js Server Action Quick Start

#### Server Action 정의 (`app/actions.ts`)

`createResilioAction`을 사용해 Server Action을 정의합니다. Expected error는 `err(...)`로, 성공은 `ok(...)`로 감싸서 반환합니다.

```ts
'use server';

import { createResilioAction } from '@resilio/next';
import { err, ok } from '@resilio/core';

export const updateName = createResilioAction(async (_prevState: any, formData: FormData) => {
  const name = formData.get('name');

  if (typeof name !== 'string' || name.length < 2) {
    return err({
      kind: 'validation',
      message: '이름은 2글자 이상이어야 합니다.',
      fields: { name: ['2글자 이상 입력해 주세요.'] },
      presentation: 'inline',
    });
  }

  // 성공 시 Result.ok 로 래핑하여 리턴
  return ok({ message: '성공적으로 저장되었습니다.' });
});
```

#### Client Component 사용 (`app/page.tsx`)

React 19 `useActionState`와 `@resilio/next`의 `toActionState`를 사용해 서버 액션을 연동합니다.

```tsx
'use client';

import { useActionState, useEffect } from 'react';
import { updateName } from './actions';
import { useResilio } from '@resilio/react';
import { toActionState } from '@resilio/next';

export function ProfileForm() {
  const [state, action, pending] = useActionState(
    updateName,
    toActionState(null) // 초기 상태 헬퍼
  );
  
  const { report } = useResilio();

  // Toast 에러 감지 및 노출
  useEffect(() => {
    if (state && !state.ok && state.error.presentation === 'toast') {
      report(state.error);
    }
  }, [state, report]);

  return (
    <form action={action}>
      <input name="name" />
      
      {/* 1. Validation Inline Error 표시 */}
      {state && !state.ok && state.error.fields?.name?.[0] && (
        <p className="error">{state.error.fields.name[0]}</p>
      )}
      
      <button disabled={pending}>저장</button>
    </form>
  );
}
```

#### `error.tsx` 연동

Unexpected error로 인해 App Router가 붕괴했을 때 `error.tsx` 바운더리에서 `reportRouteError`를 사용해 에러를 수집할 수 있습니다.

```tsx
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { reportRouteError } from '@resilio/next';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러를 Resilio Emitter로 전송 및 서버 로깅
    reportRouteError(error, { digest: error.digest });
  }, [error]);

  return (
    <div>
      <h2>문제가 발생했습니다.</h2>
      <button onClick={reset}>재시도</button>
    </div>
  );
}
```

---

## 🛠️ API & Types

### `Result<T, E>`
expected error를 타입으로 표현하는 기본 타입입니다.

```ts
export type Result<T, E = ResilioError> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

### `ResilioError`
라이브러리 전체에서 공유되는 표준화된 에러 모델입니다.

```ts
export interface ResilioError {
  kind: 'validation' | 'authorization' | 'network' | 'rate_limit' | 'server' | 'unknown';
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
  retryable?: boolean;
  presentation?: 'inline' | 'toast' | 'modal' | 'boundary';
}
```

### `withRetry<T>`
네트워크 타임아웃 등 일시적인 오류 발생 시 지정된 정책에 맞춰 재시도를 실행합니다.

```ts
import { withRetry } from '@resilio/core';

const data = await withRetry(() => fetchData(), {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
});
```

---

## ⚙️ 지원 환경 및 버전

- **React**: `>=18.3 <20` (React 19 `useActionState` 완벽 호환)
- **Next.js**: `>=15 <17` (App Router & Server Action 지원)
- **Node.js**: `>=18`

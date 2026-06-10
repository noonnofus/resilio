# Resilio

React & Next.js 환경에서 파편화된 에러 처리 흐름을 하나의 일관된 타입/API로 통합하는 Headless 에러 핸들링 라이브러리입니다.

**패키지 1개 설치, Provider 1개 감싸기.** 그게 전부입니다.

---

## 설치

```bash
# Next.js 프로젝트
npm install @resilio/next

# React 프로젝트 (Vite, CRA 등)
npm install @resilio/react
```

---

## Quick Start — Next.js

### 1. Provider 감싸기

`layout.tsx`의 `<body>` 안에 하나만 감싸면 됩니다.

```tsx
// app/layout.tsx
import { ResilioProvider } from '@resilio/next/client';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <ResilioProvider
          onUserFacingError={(error) => toast.error(error.message)}
        >
          {children}
        </ResilioProvider>
      </body>
    </html>
  );
}
```

### 2. Server Action 작성

```ts
// app/actions.ts
'use server';

import { createResilioAction, ok, err } from '@resilio/next';

export const updateUser = createResilioAction(async (_prev, formData: FormData) => {
  const name = formData.get('name');

  // 실패 → err()로 반환 (throw 안 함)
  if (!name || name.length < 2) {
    return err({
      kind: 'validation',
      message: '이름은 2글자 이상이어야 합니다.',
      fields: { name: ['2글자 이상 입력해 주세요.'] },
      presentation: 'inline',
    });
  }

  await db.user.update({ name });

  // 성공 → ok()로 반환
  return ok({ message: '저장 완료' });
});
```

### 3. Client Component에서 사용

```tsx
// app/page.tsx
'use client';

import { useActionState } from 'react';
import { updateUser } from './actions';
import { useResilio, toActionState } from '@resilio/next/client';

export default function ProfileForm() {
  const [state, action, pending] = useActionState(updateUser, toActionState(null));
  const { report } = useResilio();

  return (
    <form action={action}>
      <input name="name" />

      {/* Inline 에러 표시 */}
      {!state.ok && state.error?.fields?.name?.[0] && (
        <p className="text-red-500">{state.error.fields.name[0]}</p>
      )}

      <button disabled={pending}>저장</button>
    </form>
  );
}
```

### 4. error.tsx 연동

Unexpected 오류는 Next.js의 `error.tsx`로 자동 전달됩니다.

```tsx
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { reportRouteError } from '@resilio/next/client';

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
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

### Next.js import 규칙

| 파일 위치 | import 경로 |
|---|---|
| Server Action, Server Component | `@resilio/next` |
| Client Component (`'use client'`) | `@resilio/next/client` |

---

## Quick Start — React (Vite, CRA 등)

### 1. Provider 감싸기

`main.tsx`에서 앱 전체를 한 번만 감싸면 됩니다.

```tsx
// main.tsx
import { createRoot } from 'react-dom/client';
import { ResilioProvider } from '@resilio/react';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <ResilioProvider
    onUserFacingError={(error) => toast.error(error.message)}
  >
    <App />
  </ResilioProvider>
);
```

### 2. 에러 보고

```tsx
import { useResilio } from '@resilio/react';

function SaveButton() {
  const { report } = useResilio();

  const handleSave = async () => {
    try {
      await saveData();
    } catch (error) {
      report(error); // → Provider의 onUserFacingError로 전달
    }
  };

  return <button onClick={handleSave}>저장</button>;
}
```

### 3. Error Boundary

```tsx
import { ResilioBoundary } from '@resilio/react';

function App() {
  return (
    <ResilioBoundary
      fallback={({ error, reset }) => (
        <div>
          <p>{error.message}</p>
          <button onClick={reset}>다시 시도</button>
        </div>
      )}
    >
      <MyPage />
    </ResilioBoundary>
  );
}
```

### 4. Result 타입 활용

```tsx
import { ok, err, type Result } from '@resilio/react';

async function validateForm(data: FormData): Result<User> {
  const email = data.get('email');
  if (!email) return err({ kind: 'validation', message: '이메일을 입력하세요.' });
  return ok({ email });
}
```

React에서는 **전부 `@resilio/react`에서 import**합니다. 별도 패키지가 필요 없습니다.

---

## 핵심 규칙

| 상황 | 처리 |
|---|---|
| 사용자가 고칠 수 있는 실패 (validation, 권한 등) | `return err(...)` |
| 시스템 장애 (DB 다운, 버그) | 그냥 `throw` → Error Boundary가 잡음 |

---

## API Reference

### `Result<T, E>`

```ts
type Result<T, E = ResilioError> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

### `ResilioError`

```ts
interface ResilioError {
  kind: 'validation' | 'authorization' | 'network' | 'rate_limit' | 'server' | 'unknown';
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
  retryable?: boolean;
  presentation?: 'inline' | 'toast' | 'modal' | 'boundary';
}
```

### `withRetry<T>`

```ts
import { withRetry } from '@resilio/react'; // 또는 '@resilio/next'

const data = await withRetry(() => fetchData(), {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
});
```

---

## 보안

> [!IMPORTANT]
> 서버 오류 원문과 stack trace를 클라이언트에 노출하지 마십시오.
> `createResilioAction`은 Unexpected 오류 발생 시 자동으로 민감 정보를 제거한 뒤 클라이언트에 전달합니다.

---

## 지원 환경

- **React**: `>=18.3 <20`
- **Next.js**: `>=15 <17` (App Router & Server Action)
- **Node.js**: `>=18`

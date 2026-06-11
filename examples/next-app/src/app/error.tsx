'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main>
      <h1>요청을 처리하지 못했습니다.</h1>
      <button onClick={reset} type="button">다시 시도</button>
    </main>
  );
}

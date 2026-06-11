'use client';

import { useResilioRouteError } from '@resilio/next/client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const routeError = useResilioRouteError(error, reset);

  return (
    <main>
      <h1>요청을 처리하지 못했습니다.</h1>
      <button disabled={routeError.resetBlocked} onClick={routeError.reset} type="button">
        다시 시도
      </button>
    </main>
  );
}

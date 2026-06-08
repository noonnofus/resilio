'use client';

import React, { useEffect } from 'react';
import { reportRouteError } from '@resilio/next';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportRouteError(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center font-sans">
      <h2 className="text-2xl font-bold text-red-600 mb-2">Application Error (error.tsx)</h2>
      <p className="text-gray-600 mb-4">예기치 못한 시스템 오류가 발생했습니다. 개발자 콘솔 및 로거로 자동 전송되었습니다.</p>
      <p className="text-sm text-gray-500 mb-6 bg-gray-100 p-2 rounded max-w-md break-all">
        {error.message} (Digest: {error.digest || 'none'})
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Try again
      </button>
    </div>
  );
}

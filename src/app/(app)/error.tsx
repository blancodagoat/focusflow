'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-calm-text mb-2">Something went wrong</h2>
        <p className="text-calm-muted mb-4">Please try again</p>
        <button
          onClick={reset}
          className="calm-button-primary"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/today');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-calm-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">Focus Flow</h1>
          <p className="text-calm-muted">Start your simple task journey</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-calm-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="calm-input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-calm-text mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="calm-input"
              placeholder="••••••••"
            />
            <p className="text-xs text-calm-muted mt-1">At least 6 characters</p>
          </div>
          {error && (
            <p className="text-sm text-accent-red">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="calm-button-primary w-full"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-calm-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

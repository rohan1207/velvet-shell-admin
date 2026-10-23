'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.replace(search.get('next') || '/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#5e062a] px-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(212,175,100,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(245,238,232,0.12), transparent 35%)',
        }}
      />
      <div className="relative w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#f5eee8] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-10">
        <p className="font-label text-[10px] tracking-[0.22em] text-[#d4af64]">Velvet Shell</p>
        <h1 className="font-display mt-3 text-4xl text-[#2d2b2b]">Admin access</h1>
        <p className="mt-3 text-sm font-light text-[#7a736c]">
          Private house console. Sign in with your Supabase admin account.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="font-label text-[10px] text-[#7a736c]">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-2"
              placeholder="owner@velvetshell.com"
            />
          </label>
          <label className="block">
            <span className="font-label text-[10px] text-[#7a736c]">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-2"
              placeholder="••••••••"
            />
          </label>
          {error && <p className="text-sm text-[#5e062a]">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
            {loading ? 'Signing in…' : 'Enter console'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#5e062a]" />}>
      <LoginForm />
    </Suspense>
  );
}

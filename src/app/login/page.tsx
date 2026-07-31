'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const next = params.get('next') ?? '/';
        router.push(next);
        router.refresh();
      } else {
        setError('PIN incorrecto. Inténtalo de nuevo.');
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xs">
      <input
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="PIN"
        maxLength={8}
        className="input text-center text-2xl tracking-[0.5em]"
        autoFocus
      />
      {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || pin.length === 0}
        className="btn-primary mt-4 w-full"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        Entrar
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-black text-slate-950">
          P
        </div>
        <h1 className="text-2xl font-extrabold">PDPadel</h1>
        <p className="mt-1 text-sm text-slate-400">
          Marcador y ranking de Pádel Americano
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

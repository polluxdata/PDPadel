'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, KeyRound, User, Mail, CheckCircle2 } from 'lucide-react';

type Tab = 'email' | 'pin';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [bootHint, setBootHint] = useState('');

  useEffect(() => {
    fetch('/api/auth/bootstrap', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.created) {
          setBootHint(
            `Primera vez: usuario "superadmin" creado. Usa el PIN configurado (SUPER_ADMIN_PIN).`
          );
        }
      })
      .catch(() => {});
  }, []);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSent(false);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mode: 'login' }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo enviar el enlace.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        const next = params.get('next') ?? '/';
        router.push(next);
        router.refresh();
      } else {
        setError(data.error || 'No se pudo iniciar sesión.');
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xs">
      {bootHint && (
        <p className="mb-4 rounded-xl border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-center text-xs text-emerald-300">
          {bootHint}
        </p>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => { setTab('email'); setError(''); }}
          className={
            'flex-1 rounded-xl border py-2 text-sm font-semibold transition ' +
            (tab === 'email'
              ? 'border-emerald-500 bg-emerald-500 text-slate-950'
              : 'border-slate-700 bg-slate-800 text-slate-300')
          }
        >
          Con correo
        </button>
        <button
          onClick={() => { setTab('pin'); setError(''); }}
          className={
            'flex-1 rounded-xl border py-2 text-sm font-semibold transition ' +
            (tab === 'pin'
              ? 'border-emerald-500 bg-emerald-500 text-slate-950'
              : 'border-slate-700 bg-slate-800 text-slate-300')
          }
        >
          Con PIN
        </button>
      </div>

      {tab === 'email' ? (
        sent ? (
          <div className="rounded-xl border border-emerald-700 bg-emerald-950/30 p-5 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-300">
              Revisa tu correo
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Te enviamos un enlace para entrar. Vence en 15 minutos.
            </p>
            <button onClick={() => setSent(false)} className="btn-ghost mt-3 w-full !py-2 text-xs">
              Enviar de nuevo
            </button>
          </div>
        ) : (
          <form onSubmit={submitEmail}>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                className="input !pl-11"
                autoFocus
              />
            </div>
            {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary mt-4 w-full"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Enviarme el enlace
            </button>
            <p className="mt-4 text-center text-sm text-slate-400">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="font-semibold text-emerald-400">
                Regístrate aquí
              </Link>
            </p>
          </form>
        )
      ) : (
        <form onSubmit={submitPin}>
          <div className="relative mb-3">
            <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              autoComplete="username"
              className="input !pl-11"
            />
          </div>
          <div className="relative">
            <KeyRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              autoComplete="current-password"
              maxLength={16}
              className="input !pl-11"
            />
          </div>
          {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username || !pin}
            className="btn-primary mt-4 w-full"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Entrar
          </button>
          <p className="mt-4 text-center text-sm text-slate-400">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-semibold text-emerald-400">
              Regístrate aquí
            </Link>
          </p>
        </form>
      )}
    </div>
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

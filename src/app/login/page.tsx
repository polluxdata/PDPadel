'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
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

  return (
    <div className="w-full max-w-xs">
      {bootHint && (
        <p className="mb-4 rounded-xl border border-orange-700 bg-orange-950/40 px-3 py-2 text-center text-xs text-orange-300">
          {bootHint}
        </p>
      )}

      {sent ? (
        <div className="rounded-xl border border-orange-700 bg-orange-950/30 p-5 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-orange-400" />
          <p className="text-sm font-semibold text-orange-300">
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
            <Link href="/register" className="font-semibold text-orange-400">
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
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-950 px-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative mb-8 w-full max-w-xs text-center">
        <Image
          src="/portada.png"
          alt="PDPadel"
          width={830}
          height={1220}
          priority
          className="mx-auto mb-5 h-auto w-full rounded-3xl border border-orange-500/20 shadow-lg shadow-orange-500/10"
        />
        <h1 className="text-3xl font-extrabold tracking-tight">PDPadel</h1>
        <p className="mt-1 text-sm text-slate-400">
          Marcador y ranking de Pádel Americano
        </p>
      </div>

      <div className="relative w-full max-w-xs">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

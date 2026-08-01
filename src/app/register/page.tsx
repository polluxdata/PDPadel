'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    nickname: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          mode: 'signup',
          firstName: form.firstName,
          lastName: form.lastName,
          nickname: form.nickname,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || 'No se pudo enviar el enlace.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6 text-center">
        <div className="rounded-xl border border-emerald-700 bg-emerald-950/30 p-6">
          <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-lg font-extrabold text-emerald-300">Revisa tu correo</p>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            Te enviamos un enlace para confirmar tu registro en PDPadel. Vence en
            15 minutos.
          </p>
          <Link href="/login" className="btn-ghost mt-4 w-full !py-2 text-xs">
            Volver al login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 px-6 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-extrabold">Crear cuenta</h1>
        <p className="mt-1 text-sm text-slate-400">
          Con tu correo recibirás un enlace para confirmar tu registro.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                className="input !pl-11"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="tu@correo.com"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Apodo (opcional)</label>
            <input
              className="input"
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              placeholder="Como apareces en el ranking"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button type="submit" disabled={loading || !form.email} className="btn-primary mt-1 w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Enviarme el enlace de registro
          </button>

          <p className="text-center text-sm text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-emerald-400">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

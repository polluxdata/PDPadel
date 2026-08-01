'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    code: '',
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    nickname: '',
    pin: '',
    pin2: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.pin !== form.pin2) {
      setError('Los PIN no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          username: form.username.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || undefined,
          nickname: form.nickname.trim() || undefined,
          pin: form.pin,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        setError(data.error || 'No se pudo registrar.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6 text-center">
        <p className="text-2xl font-extrabold">¡Registrado!</p>
        <p className="mt-2 text-sm text-slate-400">
          Ya puedes iniciar sesión con tu usuario y PIN.
        </p>
        <Link href="/login" className="btn-primary mt-6">
          Ir a iniciar sesión
        </Link>
      </main>
    );
  }

  const field = 'input';
  const label = 'label';

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 px-6 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-extrabold">Crear cuenta</h1>
        <p className="mt-1 text-sm text-slate-400">
          Necesitas un código de invitación (token diario o PIN de un
          administrador).
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className={label}>Código de registro</label>
            <input
              className={field}
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="Token diario o PIN"
              autoFocus
            />
          </div>

          <div>
            <label className={label}>Usuario</label>
            <input
              className={field}
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="Cómo te vas a logear"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Nombre</label>
              <input
                className={field}
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Apellido</label>
              <input
                className={field}
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={label}>Apodo (opcional)</label>
            <input
              className={field}
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              placeholder="Como apareces en el ranking"
            />
          </div>

          <div>
            <label className={label}>Email (opcional)</label>
            <input
              type="email"
              className={field}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>PIN de acceso</label>
              <input
                type="password"
                inputMode="numeric"
                className={field}
                value={form.pin}
                onChange={(e) => set('pin', e.target.value)}
                placeholder="Mínimo 4"
              />
            </div>
            <div>
              <label className={label}>Repite el PIN</label>
              <input
                type="password"
                inputMode="numeric"
                className={field}
                value={form.pin2}
                onChange={(e) => set('pin2', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary mt-1 w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Registrarme
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

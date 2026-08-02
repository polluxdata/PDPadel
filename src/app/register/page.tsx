'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, CheckCircle2, Check, X, Loader as Spinner } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Availability = 'idle' | 'checking' | 'available' | 'taken';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function RegisterPage() {
  const supabase = useRef(createClient()).current;
  const [form, setForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  const [avail, setAvail] = useState<Availability>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Validar disponibilidad del usuario (con debounce).
  useEffect(() => {
    const value = form.username.trim().toLowerCase();
    if (!USERNAME_RE.test(value)) {
      setAvail('idle');
      return;
    }
    setAvail('checking');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', value)
        .maybeSingle();
      setAvail(data ? 'taken' : 'available');
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [form.username, supabase]);

  const usernameValid = USERNAME_RE.test(form.username.trim().toLowerCase());
  const canSubmit =
    usernameValid && avail === 'available' && form.email.trim() && form.firstName.trim();

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
          username: form.username.trim().toLowerCase(),
          firstName: form.firstName,
          lastName: form.lastName,
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
        <div className="rounded-xl border border-orange-700 bg-orange-950/30 p-6">
          <CheckCircle2 size={32} className="mx-auto mb-2 text-orange-400" />
          <p className="text-lg font-extrabold text-orange-300">Revisa tu correo</p>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            Te enviamos un enlace para confirmar tu registro en PolluxPadel. Vence en
            15 minutos.
          </p>
          <Link href="/login" className="btn-ghost mt-4 w-full !py-2 text-xs">
            Volver al login
          </Link>
        </div>
      </main>
    );
  }

  const usernameInput = form.username.trim().toLowerCase();
  const showState =
    usernameInput.length > 0 &&
    (avail === 'checking' || avail === 'available' || avail === 'taken');

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 px-6 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-extrabold">Crear cuenta</h1>
        <p className="mt-1 text-sm text-slate-400">
          Elige tu nombre de usuario: es como te van a buscar para agregarte a un
          grupo.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="label">Nombre de usuario</label>
            <div className="relative">
              <input
                className="input pr-10"
                value={form.username}
                onChange={(e) => set('username', e.target.value.toLowerCase())}
                placeholder="ej: ferandrade"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {showState &&
                  (avail === 'checking' ? (
                    <Spinner size={18} className="animate-spin text-slate-500" />
                  ) : avail === 'available' ? (
                    <Check size={18} className="text-orange-400" />
                  ) : (
                    <X size={18} className="text-rose-400" />
                  ))}
              </span>
            </div>
            <p
              className={
                'mt-1 text-xs ' +
                (usernameInput.length === 0
                  ? 'text-slate-500'
                  : !usernameValid
                    ? 'text-amber-400'
                    : avail === 'taken'
                      ? 'text-rose-400'
                      : avail === 'available'
                        ? 'text-orange-400'
                        : 'text-slate-500')
              }
            >
              {usernameInput.length === 0
                ? '3 a 20 caracteres (letras, números, _)'
                : !usernameValid
                  ? 'Solo minúsculas, números y _ (3–20)'
                  : avail === 'taken'
                    ? 'Ese nombre de usuario ya existe'
                    : avail === 'available'
                      ? '¡Disponible!'
                      : 'Comprobando…'}
            </p>
          </div>

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

          <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
            Podrás cambiar tu apodo y otros datos desde tu perfil.
          </p>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button type="submit" disabled={loading || !canSubmit} className="btn-primary mt-1 w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Enviarme el enlace de registro
          </button>

          <p className="text-center text-sm text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-orange-400">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

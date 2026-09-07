'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, CheckCircle2, Users } from 'lucide-react';
import { useSession } from '@/lib/session';

function InviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const { user, loading } = useSession();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function acceptLoggedIn() {
    setError('');
    const res = await fetch('/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (res.ok && data.groupId) {
      router.push(`/groups/${data.groupId}`);
      router.refresh();
    } else {
      setError(data.error || 'No se pudo aceptar la invitación.');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mode: 'invite', token, consent: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || 'No se pudo enviar el enlace.');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-xs">
      <div className="mb-6 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/20">
          <Users size={26} className="text-orange-400" />
        </div>
      </div>
      <h1 className="mb-2 text-center text-xl font-extrabold">Te invitaron a PolluxPadel</h1>

      {sent ? (
        <div className="rounded-xl border border-orange-700 bg-orange-950/30 p-5 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-orange-400" />
          <p className="text-sm font-semibold text-orange-300">Revisa tu correo</p>
          <p className="mt-1 text-xs text-slate-400">
            Te enviamos el enlace para unirte al grupo. Vence en 15 minutos.
          </p>
        </div>
      ) : loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Cargando…</p>
      ) : user ? (
        <div className="text-center">
          <p className="mb-1 text-sm text-slate-300">
            Hola, <span className="font-semibold">{user.username}</span>
          </p>
          <p className="mb-4 text-xs text-slate-500">
            ¿Aceptar la invitación a este grupo?
          </p>
          <button onClick={acceptLoggedIn} className="btn-primary w-full">
            Aceptar invitación
          </button>
          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4">
          <p className="mb-3 text-center text-xs text-slate-400">
            Ingresa tu correo y te enviamos el enlace para unirte al grupo.
          </p>
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="input !pl-11"
              autoFocus
            />
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
              required
            />
            <span className="text-xs leading-relaxed text-slate-300">
              He leído y acepto la{' '}
              <a
                href="/privacidad"
                target="_blank"
                className="font-semibold text-orange-400 underline-offset-2 hover:underline"
              >
                Política de Privacidad
              </a>
              . Si aún no tienes cuenta, se creará una.
            </span>
          </label>
          {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={sending || !email || !consent}
            className="btn-primary mt-4 w-full"
          >
            {sending && <Loader2 size={16} className="animate-spin" />}
            Enviarme el enlace
          </button>
        </form>
      )}
    </div>
  );
}

export default function InvitePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6">
      <Suspense fallback={null}>
        <InviteForm />
      </Suspense>
    </main>
  );
}

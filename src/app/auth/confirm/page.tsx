'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSession } from '@/lib/session';

function ConfirmView() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Enlace inválido.');
      setState('error');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok && data.redirectTo) {
          setState('ok');
          await refresh();
          router.replace(data.redirectTo);
          router.refresh();
        } else {
          setError(data.error || 'No se pudo completar el acceso.');
          setState('error');
        }
      } catch {
        setError('No se pudo completar el acceso.');
        setState('error');
      }
    })();
  }, [token, router, refresh]);

  return (
    <div className="w-full max-w-xs text-center">
      {state === 'loading' && (
        <>
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-orange-400" />
          <p className="text-sm text-slate-400">Verificando tu enlace…</p>
        </>
      )}
      {state === 'ok' && (
        <>
          <CheckCircle2 size={40} className="mx-auto mb-3 text-orange-400" />
          <p className="text-sm font-semibold text-orange-300">¡Listo, entrando!</p>
        </>
      )}
      {state === 'error' && (
        <>
          <AlertTriangle size={40} className="mx-auto mb-3 text-amber-400" />
          <p className="mb-4 text-sm font-semibold text-amber-200">{error}</p>
          <p className="mb-4 text-xs text-slate-400">
            Pide un enlace nuevo en la pantalla de acceso.
          </p>
          <Link href="/login" className="btn-primary w-full">
            Ir al login
          </Link>
        </>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6">
      <Suspense fallback={null}>
        <ConfirmView />
      </Suspense>
    </main>
  );
}

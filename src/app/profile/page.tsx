'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import AppHeader, { BottomNav } from '@/components/AppHeader';
import { useSession } from '@/lib/session';
import { ROLE_LABELS } from '@/lib/constants';
import { displayName, formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const [form, setForm] = useState({
    firstName: user?.first_name ?? '',
    lastName: user?.last_name ?? '',
    email: user?.email ?? '',
    nickname: user?.nickname ?? '',
    listed: user?.listed ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.first_name ?? '',
        lastName: user.last_name ?? '',
        email: user.email ?? '',
        nickname: user.nickname ?? '',
        listed: user.listed ?? true,
      });
    }
  }, [user]);

  function set<K extends keyof typeof form>(key: K, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMsg('');
    setSaving(true);
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        nickname: form.nickname,
        listed: form.listed,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg('Error al guardar: ' + (data.error || 'error'));
      setSaving(false);
      return;
    }
    setSaving(false);
    setMsg('Guardado correctamente.');
    await refresh();
    router.refresh();
  }

  if (!user) {
    return (
      <div>
        <AppHeader title="Perfil" backHref="/" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <AppHeader title="Mi perfil" backHref="/" />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="card mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-lg font-black text-slate-950">
            {displayName(user).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-bold">{displayName(user)}</p>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </div>
          <span className="ml-auto rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
            {ROLE_LABELS[user.role]}
          </span>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Apodo</label>
            <input className="input" value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="Como apareces en el ranking" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>

          <div className="card">
            <button
              type="button"
              onClick={() => set('listed', !form.listed)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span
                className={
                  'flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ' +
                  (form.listed ? 'justify-end bg-orange-500' : 'justify-start bg-slate-700')
                }
              >
                <span className="h-5 w-5 rounded-full bg-white" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-200">
                  Mostrarme en el listado de jugadores
                </span>
                <span className="block text-xs text-slate-400">
                  Si lo desactivas, no apareces en la búsqueda para agregarte a
                  grupos; solo puedes unirte con el código del grupo.
                </span>
              </span>
            </button>
          </div>

          {msg && (
            <p className={'text-sm ' + (msg.includes('coinciden') || msg.includes('Error') ? 'text-rose-400' : 'text-orange-400')}>
              {msg}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar cambios
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Miembro desde {formatDate(user.created_at)}
        </p>
      </main>

      <BottomNav active="profile" />
    </div>
  );
}

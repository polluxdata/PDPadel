'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import AppHeader, { BottomNav } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { audit } from '@/lib/audit';
import { ROLE_LABELS } from '@/lib/constants';
import { displayName, formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, refresh } = useSession();
  const [form, setForm] = useState({
    firstName: user?.first_name ?? '',
    lastName: user?.last_name ?? '',
    email: user?.email ?? '',
    nickname: user?.nickname ?? '',
    pin: '',
    pin2: '',
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
        pin: '',
        pin2: '',
      });
    }
  }, [user]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMsg('');
    if (form.pin && form.pin !== form.pin2) {
      setMsg('Los PIN no coinciden.');
      return;
    }
    setSaving(true);
    const patch: Record<string, unknown> = {
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email || null,
      nickname: form.nickname || null,
    };
    if (form.pin) {
      const bcrypt = await import('bcryptjs');
      patch.pin_hash = await bcrypt.hash(form.pin, 10);
    }
    const { error } = await supabase.from('users').update(patch).eq('id', user.id);
    if (error) {
      setMsg('Error al guardar: ' + error.message);
      setSaving(false);
      return;
    }
    await audit(supabase, {
      userId: user.id,
      action: 'update_profile',
      entity: 'user',
      entityId: user.id,
    });
    setForm((f) => ({ ...f, pin: '', pin2: '' }));
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-black text-slate-950">
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
            <p className="mb-2 text-sm font-semibold text-slate-300">Cambiar PIN de acceso</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nuevo PIN</label>
                <input type="password" inputMode="numeric" className="input" value={form.pin} onChange={(e) => set('pin', e.target.value)} />
              </div>
              <div>
                <label className="label">Repite el PIN</label>
                <input type="password" inputMode="numeric" className="input" value={form.pin2} onChange={(e) => set('pin2', e.target.value)} />
              </div>
            </div>
          </div>

          {msg && (
            <p className={'text-sm ' + (msg.includes('coinciden') || msg.includes('Error') ? 'text-rose-400' : 'text-emerald-400')}>
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

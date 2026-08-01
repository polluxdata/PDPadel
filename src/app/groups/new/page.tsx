'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { useSession, isAdmin } from '@/lib/session';
import { audit } from '@/lib/audit';

export default function NewGroupPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin(user)) {
      router.replace('/');
    }
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        admin_id: user.id,
        created_by: user.id,
      })
      .select('id, name')
      .single();

    if (error || !group) {
      setSaving(false);
      alert('No se pudo crear el grupo: ' + (error?.message ?? 'error'));
      return;
    }

    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
    const { data: season } = await supabase
      .from('seasons')
      .insert({ group_id: group.id, name: 'Temporada 1', start_date: new Date().toISOString().slice(0, 10), created_by: user.id })
      .select('id')
      .single();
    await audit(supabase, {
      userId: user.id,
      action: 'create_group',
      entity: 'group',
      entityId: group.id,
      details: { name: group.name },
    });
    if (season) {
      await audit(supabase, {
        userId: user.id,
        action: 'create_season',
        entity: 'season',
        entityId: season.id,
      });
    }
    router.push(`/groups/${group.id}`);
  }

  if (loading || !user) {
    return (
      <div>
        <AppHeader title="Nuevo grupo" backHref="/" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Nuevo grupo" backHref="/" />
      <main className="mx-auto max-w-lg px-4 py-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre del grupo</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pádel Quito"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea
              className="input min-h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quién juega, dónde, etc."
            />
          </div>
          <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
            Al crear el grupo se crea automáticamente la primera temporada y tú
            quedas como administrador.
          </p>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Crear grupo
          </button>
        </form>
      </main>
    </div>
  );
}

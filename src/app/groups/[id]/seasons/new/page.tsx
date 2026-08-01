'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { audit } from '@/lib/audit';

export default function NewSeasonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { user, loading } = useSession();
  const [name, setName] = useState('Temporada');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('seasons')
        .select('name')
        .eq('group_id', params.id)
        .order('created_at')
        .limit(1);
      if (data && data.length > 0) {
        setName(`${data[0].name} (nueva)`);
      }
    })();
  }, [supabase, params.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('seasons')
      .insert({
        group_id: params.id,
        name: name.trim(),
        start_date: startDate,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error || !data) {
      setSaving(false);
      alert('No se pudo crear la temporada: ' + (error?.message ?? ''));
      return;
    }
    await audit(supabase, {
      userId: user.id,
      action: 'create_season',
      entity: 'season',
      entityId: data.id,
      details: { name: name.trim() },
    });
    router.push(`/groups/${params.id}`);
  }

  if (loading || !user) {
    return (
      <div>
        <AppHeader title="Nueva temporada" backHref={`/groups/${params.id}`} />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Nueva temporada" backHref={`/groups/${params.id}`} />
      <main className="mx-auto max-w-lg px-4 py-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Fecha de inicio</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
            Solo puede haber una temporada en curso por grupo. Al cerrar esta se
            calcula el ganador y queda en solo lectura.
          </p>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Crear temporada
          </button>
        </form>
      </main>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser } from '@/lib/api/auth';
import { audit } from '@/lib/audit';
import { randomGroupCode } from '@/lib/groupRoles';

// GET /api/groups → mis grupos (roles + temporada activa)
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  const supabase = createServiceClient();

  let rows: Array<Record<string, unknown>> = [];
  if (user.role === 'super_admin') {
    const { data } = await supabase.from('groups').select('*').order('name');
    rows = (data ?? []) as Array<Record<string, unknown>>;
  } else {
    const [{ data: mine }, { data: owned }] = await Promise.all([
      supabase.from('group_members').select('group:groups(*)').eq('user_id', user.id),
      supabase.from('groups').select('*').eq('admin_id', user.id),
    ]);
    const asMember = ((mine ?? []) as unknown as Array<{ group: Record<string, unknown> | null }>)
      .map((r) => r.group)
      .filter((g): g is Record<string, unknown> => !!g);
    rows = Array.from(
      new Map([...asMember, ...((owned ?? []) as Array<Record<string, unknown>>)].map((g) => [g.id, g])).values()
    );
  }

  const myRoles = new Map<string, string>();
  if (rows.length > 0) {
    const { data: roles } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', user.id);
    for (const r of (roles ?? []) as Array<{ group_id: string; role: string }>) {
      myRoles.set(r.group_id, r.role);
    }
  }

  const groups: Array<Record<string, unknown>> = rows.map((g) => ({
    ...g,
    myRole: myRoles.get(String(g.id)) === 'admin' || g.admin_id === user.id ? 'admin' : 'member',
  }));

  // Temporadas activas de esos grupos
  let activeSeasons = new Map();
  if (rows.length > 0) {
    const { data: seasons } = await supabase
      .from('seasons')
      .select('*')
      .in('group_id', rows.map((g) => String(g.id)))
      .eq('status', 'active');
    activeSeasons = new Map((seasons ?? []).map((s: Record<string, unknown>) => [String(s.group_id), s]));
  }
  for (const g of groups) g.currentSeason = activeSeasons.get(String(g.id)) ?? null;

  return NextResponse.json({ ok: true, groups });
}

// POST /api/groups → crear grupo (quedas como admin)
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  const supabase = createServiceClient();
  const body = (await req.json().catch(() => ({}))) as { name?: string; description?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ ok: false, error: 'Nombre requerido' }, { status: 400 });
  }

  let code = '';
  for (let i = 0; i < 5; i++) {
    code = randomGroupCode();
    const { data: exists } = await supabase.from('groups').select('id').eq('code', code).limit(1);
    if (!exists || exists.length === 0) break;
    code = '';
  }
  if (!code) {
    return NextResponse.json({ ok: false, error: 'No se pudo generar código' }, { status: 500 });
  }

  const { data: group, error: gErr } = await supabase
    .from('groups')
    .insert({
      name: body.name.trim(),
      code,
      description: body.description?.trim() || null,
      admin_id: user.id,
      created_by: user.id,
    })
    .select('id, name, code')
    .single();
  if (gErr || !group) {
    return NextResponse.json({ ok: false, error: gErr?.message ?? 'Error' }, { status: 500 });
  }

  await supabase
    .from('group_members')
    .upsert({ group_id: group.id, user_id: user.id, role: 'admin' }, { onConflict: 'group_id,user_id' });
  const { data: season } = await supabase
    .from('seasons')
    .insert({ group_id: group.id, name: 'Temporada 1', start_date: new Date().toISOString().slice(0, 10), created_by: user.id })
    .select('id')
    .single();

  await audit(supabase, { userId: user.id, action: 'create_group', entity: 'group', entityId: group.id, details: { name: group.name, code } });
  if (season) {
    await audit(supabase, { userId: user.id, action: 'create_season', entity: 'season', entityId: season.id });
  }

  return NextResponse.json({ ok: true, group });
}

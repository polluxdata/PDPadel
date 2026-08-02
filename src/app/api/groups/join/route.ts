import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  const supabase = createServiceClient();
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };

  if (!code?.trim()) {
    return NextResponse.json({ ok: false, error: 'Código requerido' }, { status: 400 });
  }

  const { data: group, error: gErr } = await supabase
    .from('groups')
    .select('id, name, status')
    .ilike('code', code.trim())
    .maybeSingle();

  if (gErr || !group) {
    return NextResponse.json({ ok: false, error: 'No se encontró ningún grupo con ese código.' }, { status: 404 });
  }
  if (group.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'Ese grupo está cerrado.' }, { status: 400 });
  }

  const { error: joinErr } = await supabase
    .from('group_members')
    .upsert({ group_id: group.id, user_id: user.id, role: 'player' }, { onConflict: 'group_id,user_id' });
  if (joinErr) {
    return NextResponse.json({ ok: false, error: joinErr.message }, { status: 500 });
  }

  await audit(supabase, { userId: user.id, action: 'join_group', entity: 'group', entityId: group.id, details: { code: code.trim() } });

  return NextResponse.json({ ok: true, groupId: group.id });
}

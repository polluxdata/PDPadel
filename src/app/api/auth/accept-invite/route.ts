import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { SESSION_COOKIE } from '@/middleware';

// Acepta una invitación con el usuario ya logueado (sin pedir email).
export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Falta el token.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const uid = req.cookies.get(SESSION_COOKIE)?.value;
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: ml } = await supabase
    .from('magic_links')
    .select('*')
    .eq('token', token)
    .eq('purpose', 'invite')
    .eq('used', false)
    .maybeSingle();

  if (!ml || new Date(ml.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: 'Invitación inválida o vencida.' }, { status: 401 });
  }

  await supabase
    .from('group_members')
    .upsert(
      { group_id: ml.group_id, user_id: uid, role: ml.role ?? 'player' },
      { onConflict: 'group_id,user_id' }
    );
  await supabase.from('magic_links').update({ used: true }).eq('id', ml.id);

  await supabase.from('audit_log').insert({
    user_id: uid,
    action: 'accept_invite',
    entity: 'group_member',
    details: { group_id: ml.group_id, role: ml.role },
  });

  return NextResponse.json({ ok: true, groupId: ml.group_id });
}

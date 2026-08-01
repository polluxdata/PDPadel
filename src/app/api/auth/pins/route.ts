import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SESSION_COOKIE } from '@/middleware';
import { randomPin } from '@/lib/token';
import type { UserRole } from '@/lib/types';

interface Body {
  groupId?: string;
  role?: UserRole;
  expiresAt?: string | null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const groupId = body.groupId || null;
  const role: UserRole = body.role === 'admin' ? 'admin' : 'player';
  const expiresAt = body.expiresAt || null;

  const supabase = createClient();
  const uid = req.cookies.get(SESSION_COOKIE)?.value;
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: me } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', uid)
    .maybeSingle();

  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const isSuper = me.role === 'super_admin';

  // Un admin solo puede emitir PINs para sus propios grupos.
  if (!isSuper) {
    if (me.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }
    if (groupId) {
      const { data: group } = await supabase
        .from('groups')
        .select('admin_id')
        .eq('id', groupId)
        .maybeSingle();
      if (!group || group.admin_id !== uid) {
        return NextResponse.json({ ok: false, error: 'No eres admin de ese grupo' }, { status: 403 });
      }
    }
  }

  const code = randomPin();
  const { data, error } = await supabase
    .from('registration_codes')
    .insert({
      code,
      kind: 'pin',
      group_id: groupId,
      role,
      issued_by: uid,
      expires_at: expiresAt,
    })
    .select('id, code, role, group_id, expires_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    user_id: uid,
    action: 'issue_pin',
    entity: 'registration_code',
    entity_id: data.id,
    details: { code, role, group_id: groupId },
  });

  return NextResponse.json({ ok: true, code: data.code });
}

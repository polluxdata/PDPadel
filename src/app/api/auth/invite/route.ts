import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { SESSION_COOKIE } from '@/middleware';
import { magicToken, inviteUrl } from '@/lib/magic';
import type { UserRole } from '@/lib/types';

interface Body {
  groupId?: string;
  role?: UserRole;
}

// Genera un enlace de invitación (grupo + rol) para compartir por WhatsApp.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const groupId = body.groupId || null;
  const role: UserRole = body.role === 'admin' ? 'admin' : 'player';

  if (!groupId) {
    return NextResponse.json({ ok: false, error: 'Selecciona un grupo.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const uid = req.cookies.get(SESSION_COOKIE)?.value;
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: me } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', uid)
    .maybeSingle();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const isSuper = me.role === 'super_admin';
  if (!isSuper) {
    const { data: group } = await supabase
      .from('groups')
      .select('admin_id')
      .eq('id', groupId)
      .maybeSingle();
    const { data: mine } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', uid)
      .maybeSingle();
    const isOwner = group?.admin_id === uid;
    const isGroupAdmin = mine?.role === 'admin';
    if (!group || (!isOwner && !isGroupAdmin)) {
      return NextResponse.json({ ok: false, error: 'No eres admin de ese grupo' }, { status: 403 });
    }
  }

  const token = magicToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: ml, error } = await supabase
    .from('magic_links')
    .insert({
      user_id: null,
      email: '',
      token,
      purpose: 'invite',
      group_id: groupId,
      role,
      used: false,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    user_id: uid,
    action: 'create_invite',
    entity: 'magic_link',
    entity_id: ml.id,
    details: { group_id: groupId, role },
  });

  return NextResponse.json({ ok: true, url: inviteUrl(token) });
}

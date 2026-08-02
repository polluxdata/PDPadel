import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { magicToken, inviteUrl } from '@/lib/magic';
import { sendEmail } from '@/lib/mail';
import { checkRateLimit } from '@/lib/api/rateLimit';
import type { UserRole } from '@/lib/types';

interface Body {
  groupId?: string;
  role?: UserRole;
  email?: string;
}

// Genera un enlace de invitación (grupo + rol) para compartir por WhatsApp.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const body = (await req.json().catch(() => ({}))) as Body;
  const groupId = body.groupId || null;
  const role: UserRole = body.role === 'admin' ? 'admin' : 'player';
  const email = body.email?.trim().toLowerCase() || null;

  if (!groupId) {
    return NextResponse.json({ ok: false, error: 'Selecciona un grupo.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Rate limit de invitaciones por usuario.
  if (!(await checkRateLimit(supabase, `invite:${user.id}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, error: 'Demasiadas invitaciones. Espera un rato.' }, { status: 429 });
  }

  const isSuper = user.role === 'super_admin';
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
      .eq('user_id', user.id)
      .maybeSingle();
    const isOwner = group?.admin_id === user.id;
    const isGroupAdmin = mine?.role === 'admin';
    if (!group || (!isOwner && !isGroupAdmin)) {
      return NextResponse.json({ ok: false, error: 'No eres admin de ese grupo' }, { status: 403 });
    }
  }

  const token = magicToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: ml, error: iErr } = await supabase
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

  if (iErr) {
    return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'create_invite',
    entity: 'magic_link',
    entity_id: ml.id,
    details: { group_id: groupId, role },
  });

  const url = inviteUrl(token);

  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: 'Te invitaron a un grupo de PolluxPadel',
        html: `
          <p>Te invitaron a un grupo de <strong>PolluxPadel</strong> como ${role === 'admin' ? 'administrador' : 'jugador'}.</p>
          <p><a href="${url}">Aceptar invitación</a></p>
        `,
      });
    } catch (err) {
      console.error('[invite] error enviando correo', err);
    }
  }

  return NextResponse.json({ ok: true, url });
}

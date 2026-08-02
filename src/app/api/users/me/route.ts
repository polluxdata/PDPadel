import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

// PATCH /api/users/me → actualizar perfil propio
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();

  const body = (await req.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    nickname?: string;
    listed?: boolean;
  };

  const patch: Record<string, unknown> = {};
  if (body.firstName !== undefined) patch.first_name = body.firstName;
  if (body.lastName !== undefined) patch.last_name = body.lastName;
  if (body.nickname !== undefined) patch.nickname = body.nickname || null;
  if (body.email !== undefined) patch.email = body.email || null;
  if (body.listed !== undefined) patch.listed = Boolean(body.listed);

  const { error: uErr } = await supabase.from('users').update(patch).eq('id', user.id);
  if (uErr) return unauthorized(uErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'update_profile', entity: 'user', entityId: user.id });
  return NextResponse.json({ ok: true });
}

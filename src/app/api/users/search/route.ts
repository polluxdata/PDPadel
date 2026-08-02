import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';

// GET /api/users/search?q=... → usuarios visibles (listed) para agregar a grupos
export async function GET(req: NextRequest) {
  const { error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ ok: true, users: [] });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('users')
    .select('id, username, first_name, last_name, email, nickname, role, listed')
    .ilike('username', `%${q}%`)
    .eq('listed', true)
    .order('username')
    .limit(6);
  return NextResponse.json({ ok: true, users: data ?? [] });
}

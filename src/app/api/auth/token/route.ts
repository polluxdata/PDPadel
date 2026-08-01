import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SESSION_COOKIE } from '@/middleware';
import { dailyToken } from '@/lib/token';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const uid = req.cookies.get(SESSION_COOKIE)?.value;
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', uid)
    .maybeSingle();

  if (!user || user.role !== 'super_admin') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }

  const token = dailyToken();
  return NextResponse.json({
    ok: true,
    token,
    date: new Date().toISOString().slice(0, 10),
  });
}

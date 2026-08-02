import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// GET /api/users/check?username=fer → disponibilidad de usuario (registro público)
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim().toLowerCase();
  if (!username) return NextResponse.json({ ok: false, error: 'Falta username' }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
  return NextResponse.json({ ok: true, available: !data });
}

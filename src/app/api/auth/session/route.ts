import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { SESSION_COOKIE } from '@/middleware';

export async function GET() {
  const supabase = createServiceClient();
  const cookieStore = await import('next/headers').then((m) => m.cookies());
  const uid = cookieStore.get(SESSION_COOKIE)?.value;

  if (!uid) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, first_name, last_name, email, nickname, role, listed, is_active, created_by, created_at, updated_at')
    .eq('id', uid)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json(data);
}

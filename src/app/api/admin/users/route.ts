import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';

// GET /api/admin/users?page=&q=&filter= → paginado, filtros y membresías
// DELETE /api/admin/users/[id] → borrar usuario (super admin)
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  if (user.role !== 'super_admin') return unauthorized('Solo super admin', 403);
  const supabase = createServiceClient();

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1));
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const filter = req.nextUrl.searchParams.get('filter') ?? 'all';
  const PAGE_SIZE = 20;

  let idFilter: string[] | null = null;
  if (filter === 'group_admin' || filter === 'no_groups') {
    const { data: admins } = await supabase.from('group_members').select('user_id').eq('role', 'admin');
    const adminIds = new Set((admins ?? []).map((r) => (r as { user_id: string }).user_id));
    if (filter === 'group_admin') {
      idFilter = Array.from(adminIds);
      if (idFilter.length === 0) return NextResponse.json({ ok: true, users: [], memberships: {}, total: 0 });
    } else {
      const all = await supabase.from('group_members').select('user_id');
      idFilter = Array.from(new Set((all.data ?? []).map((r) => (r as { user_id: string }).user_id)));
    }
  }

  let builder = supabase.from('users').select('*', { count: 'exact' });
  if (q) builder = builder.or(`username.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  if (filter === 'super') builder = builder.eq('role', 'super_admin');
  else if (filter === 'group_admin' && idFilter) builder = builder.in('id', idFilter);
  else if (filter === 'no_groups' && idFilter) builder = builder.not('id', 'in', `(${idFilter.join(',')})`);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await builder.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
  const users = (data ?? []) as Array<Record<string, unknown>>;

  const memberships: Record<string, { adminIn: string[]; playerIn: string[] }> = {};
  if (users.length > 0) {
    const { data: ms } = await supabase
      .from('group_members')
      .select('user_id, role, group:groups(name)')
      .in('user_id', users.map((u) => String(u.id)));
    for (const r of (ms ?? []) as unknown as Array<{ user_id: string; role: string; group: { name: string } | null }>) {
      if (!r.group) continue;
      if (!memberships[r.user_id]) memberships[r.user_id] = { adminIn: [], playerIn: [] };
      if (r.role === 'admin') memberships[r.user_id].adminIn.push(r.group.name);
      else memberships[r.user_id].playerIn.push(r.group.name);
    }
  }

  return NextResponse.json({ ok: true, users, memberships, total: count ?? 0, page });
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

// POST /api/matches/[id] → registrar/editar resultado (admin del grupo del season)
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const mid = ctx.params.id;

  const body = (await req.json().catch(() => ({}))) as {
    score1?: number;
    score2?: number;
    winner?: 1 | 2;
    status?: string;
  };

  const { data: match } = await supabase.from('matches').select('*, quedada:quedadas(season:seasons(group_id))').eq('id', mid).maybeSingle();
  if (!match) return unauthorized('Partido no encontrado', 404);
  const groupId = (match.quedada as { season: { group_id: string } }).season.group_id;

  let isAdmin = user.role === 'super_admin';
  if (!isAdmin) {
    const { data: group } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
    const { data: mine } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();
    isAdmin = group?.admin_id === user.id || (mine as { role?: string } | null)?.role === 'admin';
  }
  if (!isAdmin) return unauthorized('Solo el administrador puede registrar marcadores', 403);

  const patch: Record<string, unknown> = {
    score_team1: body.score1 ?? 0,
    score_team2: body.score2 ?? 0,
    sets_details: null,
    winner_team: body.winner ?? null,
    status: body.status === 'skipped' ? 'skipped' : 'completed',
  };
  const { error: uErr } = await supabase.from('matches').update(patch).eq('id', mid);
  if (uErr) return unauthorized(uErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'complete_match', entity: 'match', entityId: mid, details: patch });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) {
    return NextResponse.json({ user: null }, { status: error.status });
  }
  return NextResponse.json(user);
}

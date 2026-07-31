import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/middleware';
import { APP_NAME } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  const expected = process.env.APP_PIN ?? '1234';

  if (!pin || pin !== expected) {
    return NextResponse.json({ ok: false, error: 'PIN incorrecto' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, app: APP_NAME });
  res.cookies.set(SESSION_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

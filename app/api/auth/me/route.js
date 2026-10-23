import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';

export async function GET(request) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email: session.email, role: session.role });
}

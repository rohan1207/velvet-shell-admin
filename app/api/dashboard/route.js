import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { getDashboardStats } from '@/lib/dashboard';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

export async function GET(request) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[dashboard GET]', err);
    return NextResponse.json(
      { error: err.message || 'Could not load dashboard' },
      { status: 500 }
    );
  }
}

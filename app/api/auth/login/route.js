import { NextResponse } from 'next/server';
import {
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/session';
import { createAdminSupabase, createAnonSupabase } from '@/lib/supabase';

const attempts = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const row = attempts.get(ip) || { count: 0, start: now };
  if (now - row.start > 15 * 60 * 1000) {
    attempts.set(ip, { count: 1, start: now });
    return false;
  }
  row.count += 1;
  attempts.set(ip, row);
  return row.count > 12;
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const anon = createAnonSupabase();
    const { data, error } = await anon.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      const detail = `${error?.message || ''} ${error?.cause?.message || ''}`;
      if (/certificate|UNABLE_TO_VERIFY|fetch failed/i.test(detail)) {
        return NextResponse.json(
          {
            error:
              'TLS to Supabase failed. Set SUPABASE_INSECURE_TLS=1 in admin/.env.local and restart.',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const admin = createAdminSupabase();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[admin login] profile', profileError);
      return NextResponse.json({ error: 'Could not verify admin role.' }, { status: 500 });
    }

    if (profile?.role !== 'admin') {
      await anon.auth.signOut();
      return NextResponse.json(
        { error: 'This account does not have admin access.' },
        { status: 403 }
      );
    }

    // End the Supabase browser session — admin console uses its own signed cookie.
    await anon.auth.signOut();

    const token = createSessionToken(email);
    const response = NextResponse.json({
      ok: true,
      email,
      name: profile.full_name || '',
    });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (err) {
    console.error('[admin login]', err);
    const detail = `${err?.message || ''} ${err?.cause?.message || ''}`;
    let message = 'Login failed. Please try again.';
    if (/not configured/i.test(detail)) {
      message = 'Supabase is not configured on the admin server.';
    } else if (/certificate|UNABLE_TO_VERIFY|fetch failed/i.test(detail)) {
      message =
        'TLS to Supabase failed. Set SUPABASE_INSECURE_TLS=1 in admin/.env.local and restart the admin server.';
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

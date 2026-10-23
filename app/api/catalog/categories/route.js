import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { listCategories, saveCategory } from '@/lib/catalog';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const categories = await listCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error('[categories GET]', err);
    return NextResponse.json({ error: err.message, categories: [] }, { status: 500 });
  }
}

export async function POST(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const body = await request.json();
    const category = await saveCategory(body);
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

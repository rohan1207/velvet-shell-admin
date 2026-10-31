import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import {
  DEFAULT_GIFT_OPTIONS,
  loadGiftOptions,
  saveGiftOptions,
} from '@/lib/gift-options';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const options = await loadGiftOptions();
    return NextResponse.json({ options });
  } catch (err) {
    console.error('[gift-options GET]', err);
    return NextResponse.json(
      {
        error: err.message || 'Could not load gift options',
        options: DEFAULT_GIFT_OPTIONS,
      },
      { status: /relation|does not exist|schema/i.test(err.message || '') ? 200 : 500 },
    );
  }
}

export async function PUT(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const body = await request.json().catch(() => ({}));
    const options = await saveGiftOptions(body);
    return NextResponse.json({ ok: true, options });
  } catch (err) {
    console.error('[gift-options PUT]', err);
    return NextResponse.json(
      { error: err.message || 'Could not save gift options' },
      { status: 500 },
    );
  }
}

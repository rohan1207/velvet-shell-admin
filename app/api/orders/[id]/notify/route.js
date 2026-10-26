import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { createAdminSupabase } from '@/lib/supabase';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';
import { sendOrderEmails, sendShipmentEmails } from '@/lib/mail';

/**
 * POST { type?: 'order' | 'shipped' | 'delivered' }
 * Resend buyer + owner emails for an existing order.
 */
export async function POST(request, { params }) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const type = body.type === 'shipped' || body.type === 'delivered' ? body.type : 'order';

    const db = createAdminSupabase();
    let { data: row, error } = await db
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      const byNum = await db
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', id)
        .maybeSingle();
      row = byNum.data;
    }
    if (!row) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const ship = row.shipping || {};
    const customerName =
      ship.fullName ||
      [ship.firstName, ship.lastName].filter(Boolean).join(' ') ||
      '';

    let result;
    if (type === 'order') {
      result = await sendOrderEmails({
        order: row,
        items: row.order_items || [],
        customerName,
      });
    } else {
      if (!row.awb && type === 'shipped') {
        return NextResponse.json(
          { error: 'No AWB on this order yet — book Delhivery first.' },
          { status: 400 },
        );
      }
      result = await sendShipmentEmails({
        order: row,
        items: row.order_items || [],
        event: type,
        customerName,
      });
    }

    if (!result?.ok) {
      return NextResponse.json(
        {
          error:
            result?.reason === 'no-recipients'
              ? 'No valid email recipients configured.'
              : result?.stub
                ? 'RESEND_API_KEY is missing on admin.'
                : 'Email send failed — check Resend logs / domain.',
          result,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, type, result });
  } catch (err) {
    console.error('[orders/notify]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

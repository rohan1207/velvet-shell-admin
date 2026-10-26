import { Resend } from 'resend';
import { createAdminSupabase } from '@/lib/supabase';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';
import {
  fromAddress,
  lookLikeEmail,
  siteUrl,
  renderStockAvailableEmail,
} from '@/lib/email/templates';

export async function flushStockNotify({ kind = 'product', slug, name }) {
  allowInsecureTlsIfConfigured();
  const targetSlug = String(slug || '')
    .trim()
    .toLowerCase();
  if (!targetSlug) return { sent: 0 };

  const db = createAdminSupabase();
  const { data: rows, error } = await db
    .from('stock_notify_requests')
    .select('id,email,product_name')
    .eq('kind', kind === 'set' ? 'set' : 'product')
    .eq('target_slug', targetSlug);
  if (error) throw error;
  if (!rows?.length) return { sent: 0 };

  const resendKey = process.env.RESEND_API_KEY;
  const path = kind === 'set' ? `/sets/${targetSlug}` : `/shop/${targetSlug}`;
  const url = `${siteUrl()}${path}`;
  const displayName = name || rows[0].product_name || targetSlug;
  const { subject, html } = renderStockAvailableEmail({
    productName: displayName,
    productUrl: url,
  });

  let sent = 0;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const from = fromAddress();
    for (const row of rows) {
      if (!lookLikeEmail(row.email)) continue;
      try {
        const { error: mailErr } = await resend.emails.send({
          from,
          to: [row.email],
          subject,
          html,
        });
        if (!mailErr) sent += 1;
        else console.error('[stock-notify] mail', mailErr);
      } catch (err) {
        console.error('[stock-notify] mail', err);
      }
    }
  } else {
    console.warn('[stock-notify] RESEND_API_KEY missing — clearing waitlist without mail');
  }

  const ids = rows.map((r) => r.id);
  await db.from('stock_notify_requests').delete().in('id', ids);
  return { sent, cleared: ids.length };
}

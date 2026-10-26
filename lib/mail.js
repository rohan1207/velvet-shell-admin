/**
 * Admin transactional email (Resend) — same templates as storefront.
 */
import { Resend } from 'resend';
import {
  fromAddress,
  lookLikeEmail,
  ownerNotifyEmails,
  renderBuyerOrderEmail,
  renderOwnerOrderEmail,
  renderBuyerShipmentEmail,
  renderOwnerShipmentEmail,
} from '@/lib/email/templates';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function sendMany(jobs) {
  if (!jobs.length) return { ok: false, reason: 'no-recipients', sent: 0, total: 0 };
  const settled = await Promise.allSettled(jobs.map((j) => j.promise));
  let okCount = 0;
  settled.forEach((result, i) => {
    const job = jobs[i];
    const err =
      result.status === 'rejected' ? result.reason : result.value?.error || null;
    if (err) {
      console.error('[admin/mail] send failed', {
        label: job.label,
        to: job.to,
        from: job.from,
        message: err?.message || err,
      });
    } else {
      okCount += 1;
    }
  });
  return { ok: okCount > 0, sent: okCount, total: jobs.length };
}

export async function sendOrderEmails({ order, items = [], customerName }) {
  const resend = getResend();
  const toCustomer = String(order.email || '').trim().toLowerCase();
  const ownerList = ownerNotifyEmails();
  const buyer = renderBuyerOrderEmail({ order, items, customerName });
  const owner = renderOwnerOrderEmail({ order, items });

  if (!resend) {
    console.warn('[admin/orders] RESEND_API_KEY missing — skipped');
    return { ok: false, stub: true };
  }

  const from = fromAddress();
  const jobs = [];
  if (toCustomer && lookLikeEmail(toCustomer)) {
    jobs.push({
      label: 'customer',
      to: toCustomer,
      from,
      promise: resend.emails.send({
        from,
        to: [toCustomer],
        subject: buyer.subject,
        html: buyer.html,
      }),
    });
  }
  for (const ownerTo of ownerList) {
    jobs.push({
      label: 'owner',
      to: ownerTo,
      from,
      promise: resend.emails.send({
        from,
        to: [ownerTo],
        subject: owner.subject,
        html: owner.html,
      }),
    });
  }

  if (!jobs.length) {
    console.warn('[admin/orders] no recipients', { toCustomer, ownerList });
    return { ok: false, reason: 'no-recipients' };
  }
  return sendMany(jobs);
}

export async function sendShipmentEmails({
  order,
  items = [],
  event = 'shipped',
  customerName,
}) {
  const resend = getResend();
  const toCustomer = String(order.email || '').trim().toLowerCase();
  const ownerList = ownerNotifyEmails();
  const buyer = renderBuyerShipmentEmail({ order, items, event, customerName });
  const owner = renderOwnerShipmentEmail({ order, event });

  if (!resend) {
    console.warn('[admin/shipment] RESEND_API_KEY missing — skipped');
    return { ok: false, stub: true };
  }

  const from = fromAddress();
  const jobs = [];
  if (toCustomer && lookLikeEmail(toCustomer)) {
    jobs.push({
      label: 'customer',
      to: toCustomer,
      from,
      promise: resend.emails.send({
        from,
        to: [toCustomer],
        subject: buyer.subject,
        html: buyer.html,
      }),
    });
  }
  for (const ownerTo of ownerList) {
    jobs.push({
      label: 'owner',
      to: ownerTo,
      from,
      promise: resend.emails.send({
        from,
        to: [ownerTo],
        subject: owner.subject,
        html: owner.html,
      }),
    });
  }

  if (!jobs.length) {
    console.warn('[admin/shipment] no recipients', { toCustomer, ownerList });
    return { ok: false, reason: 'no-recipients' };
  }
  return sendMany(jobs);
}

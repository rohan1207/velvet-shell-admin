/**
 * Shared Velvet Shell transactional email templates.
 * Mobile-first, single card, table-based (email-client safe).
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatInr(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

/** Never fall back to onboarding@resend.dev — that lands in spam. */
export function fromAddress() {
  const env = String(process.env.RESEND_FROM_EMAIL || '').trim();
  const verified = 'Velvet Shell <sales@velvetshell.in>';
  if (env && !/resend\.dev/i.test(env)) return env;
  if (env && /resend\.dev/i.test(env)) {
    console.warn(
      '[mail] RESEND_FROM_EMAIL uses resend.dev — using verified domain instead',
    );
  }
  return verified;
}

export function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.STOREFRONT_ORIGIN ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    '';
  if (raw) {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    if (!/localhost|127\.0\.0\.1/i.test(withProto)) {
      return withProto.replace(/\/$/, '');
    }
  }
  return 'https://velvetshell.com';
}

export function lookLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

/** Owner / ops inboxes — never use ADMIN_EMAIL login usernames. */
export function ownerNotifyEmails() {
  const raw = [process.env.ORDERS_NOTIFY_EMAIL, process.env.RESEND_TO_OWNER]
    .filter(Boolean)
    .join(',');
  const seen = new Set();
  const list = [];
  for (const part of raw.split(/[,;]+/)) {
    const email = String(part || '').trim().toLowerCase();
    if (!lookLikeEmail(email) || seen.has(email)) continue;
    seen.add(email);
    list.push(email);
  }
  return list;
}

function preheaderHtml(text) {
  const t = escapeHtml(text || '');
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${t}</div>`;
}

function btn(href, label) {
  return `
    <a href="${escapeHtml(href)}"
       style="display:inline-block;background:#5e062a;color:#faf6f1;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;padding:14px 28px;border-radius:999px;">
      ${escapeHtml(label)}
    </a>`;
}

/**
 * Outer responsive shell + white card on soft ivory.
 */
export function emailShell({ preheader, eyebrow, title, introHtml = '', bodyHtml, footerNote }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title || 'Velvet Shell')}</title>
</head>
<body style="margin:0;padding:0;background:#f3ebe3;color:#2d2b2b;">
  ${preheaderHtml(preheader)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ebe3;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding:8px 8px 20px;text-align:center;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#b08d4a;">Velvet Shell</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(45,43,43,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:4px;background:#5e062a;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:28px 24px 8px;">
                    ${
                      eyebrow
                        ? `<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#b08d4a;">${escapeHtml(eyebrow)}</p>`
                        : ''
                    }
                    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25;color:#2d2b2b;">${escapeHtml(title)}</h1>
                    ${
                      introHtml
                        ? `<div style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#5a534c;">${introHtml}</div>`
                        : ''
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 28px;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 12px 8px;text-align:center;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a827a;">
                ${footerNote || `© ${year} Velvet Shell · Fine jewellery`}
              </p>
              <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#a39b93;">
                <a href="${siteUrl()}" style="color:#5e062a;text-decoration:none;">velvetshell.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function sectionTitle(label) {
  return `<p style="margin:28px 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#8a827a;">${escapeHtml(label)}</p>`;
}

export function kvTable(rows) {
  const body = (rows || [])
    .filter((r) => r && r.value != null && String(r.value).trim() !== '')
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0e8e0;vertical-align:top;width:38%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#8a827a;">${escapeHtml(r.label)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0e8e0;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#2d2b2b;text-align:right;">${r.html ? r.value : escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>`;
}

function itemMeta(item) {
  const color = item.color_label || item.colorLabel || '';
  const bits = [color, item.metal, item.size ? `Size ${item.size}` : '']
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  return bits.join(' · ');
}

export function lineItemsTable(items = [], { showSku = false } = {}) {
  const rows = (items || [])
    .map((item) => {
      const title = escapeHtml(item.product_name || item.name || item.product_slug || 'Item');
      const meta = escapeHtml(itemMeta(item));
      const sku = String(item.sku || '').trim();
      const qty = item.qty || 1;
      const line = formatInr(item.line_total ?? item.lineTotal ?? (Number(item.unit_price || item.price) || 0) * qty);
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #f0e8e0;vertical-align:top;">
            ${
              showSku && sku
                ? `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#5e062a;font-weight:700;margin-bottom:4px;">SKU ${escapeHtml(sku)}</div>`
                : ''
            }
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#2d2b2b;">${title}</div>
            ${meta ? `<div style="margin-top:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#8a827a;">${meta}</div>` : ''}
          </td>
          <td style="padding:14px 8px;border-bottom:1px solid #f0e8e0;vertical-align:top;text-align:center;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#5a534c;">×${qty}</td>
          <td style="padding:14px 0;border-bottom:1px solid #f0e8e0;vertical-align:top;text-align:right;white-space:nowrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#2d2b2b;">${line}</td>
        </tr>`;
    })
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#a39b93;">Item</td>
        <td style="padding:0 8px 6px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#a39b93;">Qty</td>
        <td style="padding:0 0 6px;text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#a39b93;">Amount</td>
      </tr>
      ${rows}
    </table>`;
}

export function totalsBlock(order) {
  const subtotal = Number(order.subtotal) || 0;
  const shipping = Number(order.shipping_fee ?? order.shippingFee) || 0;
  const discount = Number(order.discount_amount ?? order.discountAmount) || 0;
  const code = String(order.discount_code || order.discountCode || '').trim();
  const total = Number(order.total) || Math.max(0, subtotal - discount + shipping);

  const rows = [
    { label: 'Subtotal', value: formatInr(subtotal) },
    {
      label: 'Shipping',
      value: shipping > 0 ? formatInr(shipping) : 'Complimentary',
    },
  ];
  if (discount > 0) {
    rows.push({
      label: code ? `Discount (${code})` : 'Discount',
      value: `−${formatInr(discount)}`,
    });
  }
  rows.push({ label: 'Total', value: formatInr(total), strong: true });

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      ${rows
        .map(
          (r) => `
        <tr>
          <td style="padding:7px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:${r.strong ? '14px' : '13px'};color:${r.strong ? '#2d2b2b' : '#8a827a'};font-weight:${r.strong ? '600' : '400'};">${escapeHtml(r.label)}</td>
          <td style="padding:7px 0;text-align:right;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:${r.strong ? '16px' : '13px'};color:${r.strong ? '#5e062a' : '#2d2b2b'};font-weight:${r.strong ? '600' : '400'};">${escapeHtml(r.value)}</td>
        </tr>`,
        )
        .join('')}
    </table>`;
}

export function shippingBlock(order) {
  const ship = order.shipping || {};
  const name =
    ship.fullName ||
    [ship.firstName, ship.lastName].filter(Boolean).join(' ') ||
    '';
  const line1 = ship.line1 || ship.address || '';
  const line2 = ship.line2 || '';
  const cityLine = [ship.city, ship.state, ship.postal || ship.pincode]
    .filter(Boolean)
    .join(', ');
  const country = ship.country || 'India';
  const phone = ship.phone || ship.mobile || '';
  const email = order.email || ship.email || '';

  const addressHtml = [
    name,
    line1,
    line2,
    cityLine,
    country,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br/>');

  return kvTable([
    { label: 'Name', value: name },
    { label: 'Email', value: email },
    { label: 'Phone', value: phone },
    { label: 'Address', value: addressHtml || '—', html: true },
  ]);
}

export function paymentBlock(order) {
  const paymentId =
    order.razorpay_payment_id ||
    order.paymentId ||
    order.payments?.[0]?.razorpay_payment_id ||
    '';
  const razorpayOrder =
    order.razorpay_order_id || order.razorpayOrderId || '';
  const method = order.paymentMethod || 'Razorpay';
  const demo = /demo/i.test(String(order.notes || '')) || order.demo;

  return kvTable([
    { label: 'Method', value: demo ? `${method} (demo)` : method },
    { label: 'Status', value: demo ? 'Demo / test' : 'Paid' },
    { label: 'Razorpay order', value: razorpayOrder },
    { label: 'Payment ID', value: paymentId },
    { label: 'Currency', value: order.currency || 'INR' },
  ]);
}

export function ctaBlock(href, label) {
  return `<div style="margin-top:28px;text-align:center;">${btn(href, label)}</div>`;
}

function orderBasics(order) {
  const orderNo = order.order_number || order.orderNumber || order.id;
  return {
    orderNo,
    placed: formatDate(order.created_at || order.createdAt),
  };
}

/** Buyer: order confirmed */
export function renderBuyerOrderEmail({ order, items, customerName }) {
  const { orderNo, placed } = orderBasics(order);
  const name = escapeHtml(
    customerName || order.shipping?.fullName || order.shipping?.firstName || 'there',
  );
  const body = `
    ${sectionTitle('Order')}
    ${kvTable([
      { label: 'Order number', value: orderNo },
      { label: 'Placed', value: placed },
      { label: 'Status', value: 'Confirmed' },
    ])}
    ${sectionTitle('Items')}
    ${lineItemsTable(items)}
    ${sectionTitle('Summary')}
    ${totalsBlock(order)}
    ${sectionTitle('Delivery')}
    ${shippingBlock(order)}
    ${sectionTitle('Payment')}
    ${paymentBlock(order)}
    ${ctaBlock(`${siteUrl()}/account?tab=orders`, 'View your orders')}
  `;
  return {
    subject: `Order ${orderNo} confirmed · Velvet Shell`,
    html: emailShell({
      preheader: `Your Velvet Shell order ${orderNo} is confirmed · ${formatInr(order.total)}`,
      eyebrow: 'Order confirmation',
      title: 'Thank you for your order',
      introHtml: `Hello ${name}, we’ve received your order and payment. Here’s everything you need.`,
      bodyHtml: body,
    }),
  };
}

/** Owner: new order */
export function renderOwnerOrderEmail({ order, items }) {
  const { orderNo, placed } = orderBasics(order);
  const toCustomer = String(order.email || '').trim().toLowerCase();
  const body = `
    ${sectionTitle('Order')}
    ${kvTable([
      { label: 'Order number', value: orderNo },
      { label: 'Placed', value: placed },
      { label: 'Total', value: formatInr(order.total) },
      { label: 'Customer', value: toCustomer },
    ])}
    ${sectionTitle('Customer & delivery')}
    ${shippingBlock(order)}
    ${sectionTitle('Payment')}
    ${paymentBlock(order)}
    ${sectionTitle('Line items')}
    ${lineItemsTable(items, { showSku: true })}
    ${sectionTitle('Summary')}
    ${totalsBlock(order)}
  `;
  return {
    subject: `New order ${orderNo} · Velvet Shell`,
    html: emailShell({
      preheader: `New order ${orderNo} · ${formatInr(order.total)} · ${toCustomer}`,
      eyebrow: 'Orders · Velvet Shell',
      title: 'New order received',
      introHtml: 'A prepaid order is ready for fulfilment. Review customer, payment and SKUs below.',
      bodyHtml: body,
    }),
  };
}

/** Buyer + owner shipment / delivered */
export function renderBuyerShipmentEmail({ order, items, event, customerName }) {
  const { orderNo } = orderBasics(order);
  const isDelivered = event === 'delivered';
  const name = escapeHtml(
    customerName || order.shipping?.fullName || order.shipping?.firstName || 'there',
  );
  const awb = order.awb || '';
  const trackingUrl =
    order.tracking_url ||
    order.trackingUrl ||
    (awb
      ? `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`
      : '');

  const body = `
    ${sectionTitle('Shipment')}
    ${kvTable([
      { label: 'Order number', value: orderNo },
      { label: 'Courier', value: order.courier || 'Delhivery' },
      { label: 'AWB', value: awb },
      {
        label: 'Status',
        value: isDelivered
          ? 'Delivered'
          : order.shipment_status || order.shipmentStatus || 'Shipped',
      },
    ])}
    ${
      trackingUrl
        ? ctaBlock(trackingUrl, 'Track on Delhivery')
        : ''
    }
    ${sectionTitle('Items')}
    ${lineItemsTable(items)}
    ${sectionTitle('Delivering to')}
    ${shippingBlock(order)}
    ${ctaBlock(`${siteUrl()}/account?tab=orders`, 'View your orders')}
  `;

  return {
    subject: isDelivered
      ? `Delivered · Order ${orderNo} · Velvet Shell`
      : `Shipped · Order ${orderNo} · Velvet Shell`,
    html: emailShell({
      preheader: isDelivered
        ? `Order ${orderNo} was delivered`
        : `Order ${orderNo} is on the way${awb ? ` · AWB ${awb}` : ''}`,
      eyebrow: isDelivered ? 'Delivered' : 'On the way',
      title: isDelivered ? 'Your order was delivered' : 'Your order is on the way',
      introHtml: isDelivered
        ? `Hello ${name}, your Velvet Shell order has been delivered. We hope you love it.`
        : `Hello ${name}, your order has been handed to Delhivery. Use the tracking details below anytime.`,
      bodyHtml: body,
    }),
  };
}

export function renderOwnerShipmentEmail({ order, event }) {
  const { orderNo } = orderBasics(order);
  const isDelivered = event === 'delivered';
  const awb = order.awb || '';
  const trackingUrl =
    order.tracking_url ||
    order.trackingUrl ||
    (awb
      ? `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`
      : '');
  const toCustomer = String(order.email || '').trim().toLowerCase();

  const body = `
    ${sectionTitle('Shipment')}
    ${kvTable([
      { label: 'Order number', value: orderNo },
      { label: 'Customer', value: toCustomer },
      { label: 'AWB', value: awb },
      { label: 'Courier', value: order.courier || 'Delhivery' },
      {
        label: 'Status',
        value: isDelivered
          ? 'Delivered'
          : order.shipment_status || order.shipmentStatus || 'Manifested',
      },
    ])}
    ${trackingUrl ? ctaBlock(trackingUrl, 'Open tracking') : ''}
    ${sectionTitle('Delivery address')}
    ${shippingBlock(order)}
  `;

  return {
    subject: isDelivered
      ? `Delivered ${orderNo} · Velvet Shell`
      : `Shipped ${orderNo} · AWB ${awb || '—'} · Velvet Shell`,
    html: emailShell({
      preheader: isDelivered
        ? `Delivered ${orderNo}`
        : `Shipment booked ${orderNo} · AWB ${awb}`,
      eyebrow: 'Orders · Logistics',
      title: isDelivered ? 'Order delivered' : 'Shipment booked',
      introHtml: isDelivered
        ? 'Delhivery marked this order as delivered.'
        : 'A Delhivery AWB was created for this order.',
      bodyHtml: body,
    }),
  };
}

export function renderPasswordResetEmail({ fullName, code, accountUrl, loginUrl }) {
  const name = escapeHtml(fullName || 'there');
  const body = `
    <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#5a534c;">
      Hello ${name}, use this one-time code to reset your password. It expires in 15 minutes.
    </p>
    <div style="margin:8px 0 24px;padding:20px;border-radius:16px;background:#faf6f1;text-align:center;">
      <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:32px;letter-spacing:0.28em;color:#5e062a;font-weight:600;">${escapeHtml(code)}</p>
    </div>
    ${ctaBlock(accountUrl, 'Enter code & reset')}
    <p style="margin:20px 0 0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#8a827a;">
      Or <a href="${escapeHtml(loginUrl)}" style="color:#5e062a;">sign in to your account</a>
    </p>
  `;
  return {
    subject: 'Your Velvet Shell password reset code',
    html: emailShell({
      preheader: 'Your password reset code · expires in 15 minutes',
      eyebrow: 'Security',
      title: 'Reset your password',
      bodyHtml: body,
      footerNote: 'If you did not request this, you can ignore this email.',
    }),
  };
}

export function renderGiftingEnquiryEmail({ name, email, occasion, note }) {
  const body = `
    ${sectionTitle('Enquiry')}
    ${kvTable([
      { label: 'Name', value: name },
      { label: 'Email', value: email },
      { label: 'Occasion', value: occasion || 'Not specified' },
    ])}
    ${sectionTitle('Note')}
    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#5a534c;white-space:pre-wrap;">${escapeHtml(note || '—')}</p>
  `;
  return {
    subject: `Gifting enquiry · ${String(occasion || 'Velvet Shell').slice(0, 48)}`,
    html: emailShell({
      preheader: `Gifting enquiry from ${name}`,
      eyebrow: 'Gifting',
      title: 'New gifting enquiry',
      introHtml: 'Someone reached out about a gift or custom piece.',
      bodyHtml: body,
    }),
  };
}

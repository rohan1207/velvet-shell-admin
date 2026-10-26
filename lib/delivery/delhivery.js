/**
 * Delhivery B2C create-shipment (CMU) client.
 * Docs: https://one.delhivery.com/developer-portal/documents/b2c/
 */

function baseUrl() {
  return (
    process.env.DELHIVERY_API_BASE_URL ||
    'https://track.delhivery.com'
  ).replace(/\/$/, '');
}

function token() {
  const t = String(process.env.DELHIVERY_API_TOKEN || '').trim();
  if (!t) throw new Error('DELHIVERY_API_TOKEN is not set');
  return t;
}

function pickupName() {
  const n = String(process.env.DELHIVERY_PICKUP_NAME || '').trim();
  if (!n) throw new Error('DELHIVERY_PICKUP_NAME is not set');
  return n;
}

function numEnv(key, fallback) {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Strip characters Delhivery rejects in raw JSON payloads. */
function sanitize(value) {
  return String(value || '')
    .replace(/[&#%\\;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function digitsPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return d;
}

/**
 * Build CMU shipment payload from a Velvet Shell order row + items.
 */
export function buildShipmentPayload(order, items = []) {
  const ship = order.shipping || {};
  const name =
    ship.fullName ||
    [ship.firstName, ship.lastName].filter(Boolean).join(' ') ||
    order.email ||
    'Customer';
  const phone = digitsPhone(ship.phone || ship.mobile);
  const address = sanitize(
    [ship.line1 || ship.address, ship.line2].filter(Boolean).join(', '),
  );
  const pin = String(ship.postal || ship.pincode || '').replace(/\D/g, '');
  const city = sanitize(ship.city);
  const state = sanitize(ship.state);
  const products = sanitize(
    (items || [])
      .map((it) => `${it.product_name || it.name || it.product_slug} x${it.qty || 1}`)
      .join(', ')
      .slice(0, 200) || 'Jewellery',
  );

  if (!phone || phone.length < 10) {
    throw new Error('Customer phone is required (10 digits) to book Delhivery');
  }
  if (!address) throw new Error('Shipping address is required');
  if (pin.length !== 6) throw new Error('Valid 6-digit pincode is required');

  const weight = numEnv('DELHIVERY_DEFAULT_WEIGHT_GMS', 300);
  const length = numEnv('DELHIVERY_DEFAULT_LENGTH_CM', 15);
  const width = numEnv('DELHIVERY_DEFAULT_WIDTH_CM', 12);
  const height = numEnv('DELHIVERY_DEFAULT_HEIGHT_CM', 4);

  const shipment = {
    name: sanitize(name),
    order: sanitize(order.order_number || order.orderNumber),
    phone,
    add: address,
    pin: Number(pin),
    city,
    state,
    country: sanitize(ship.country || 'India') || 'India',
    payment_mode: 'Prepaid',
    total_amount: Number(order.total) || 0,
    products_desc: products,
    quantity: String(
      (items || []).reduce((sum, it) => sum + (Number(it.qty) || 1), 0) || 1,
    ),
    weight,
    shipment_length: length,
    shipment_width: width,
    shipment_height: height,
    fragile_shipment: true,
  };

  const returnAddress = String(process.env.DELHIVERY_RETURN_ADDRESS || '').trim();
  if (returnAddress) {
    shipment.return_name = sanitize(
      process.env.DELHIVERY_RETURN_NAME || pickupName(),
    );
    shipment.return_phone = digitsPhone(
      process.env.DELHIVERY_RETURN_PHONE || process.env.DELHIVERY_PICKUP_PHONE,
    );
    shipment.return_address = sanitize(returnAddress);
    shipment.return_city = sanitize(process.env.DELHIVERY_RETURN_CITY || '');
    shipment.return_state = sanitize(process.env.DELHIVERY_RETURN_STATE || '');
    shipment.return_pin = Number(
      String(process.env.DELHIVERY_RETURN_PIN || '').replace(/\D/g, ''),
    );
    shipment.return_country = 'India';
  }

  return {
    shipments: [shipment],
    pickup_location: { name: pickupName() },
  };
}

export function trackingUrlForAwb(awb) {
  const waybill = String(awb || '').trim();
  if (!waybill) return '';
  return `https://www.delhivery.com/track/package/${encodeURIComponent(waybill)}`;
}

/**
 * Create a forward prepaid shipment. Returns { awb, raw }.
 */
export async function createShipment(order, items = []) {
  const payload = buildShipmentPayload(order, items);
  const url = `${baseUrl()}/api/cmu/create.json`;

  // Classic CMU expects application/x-www-form-urlencoded with format + data
  const body = new URLSearchParams();
  body.set('format', 'json');
  body.set('data', JSON.stringify(payload));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Delhivery returned non-JSON (${res.status}): ${text.slice(0, 240)}`);
  }

  if (!res.ok) {
    throw new Error(
      data?.rmk || data?.Error || data?.message || `Delhivery HTTP ${res.status}`,
    );
  }

  // Response shapes vary: packages[].waybill | packages[].remarks | success / error
  const packages = data?.packages || data?.Packages || [];
  const first = Array.isArray(packages) ? packages[0] : null;
  const awb =
    first?.waybill ||
    first?.Waybill ||
    first?.wb ||
    data?.waybill ||
    data?.AWB ||
    '';

  const remark = first?.remarks || first?.remark || data?.rmk || '';
  const failed =
    data?.success === false ||
    /error|fail|invalid|does not exist/i.test(String(remark)) ||
    (!awb && data?.cash_pickups_count === 0 && !first);

  if (!awb) {
    const msg =
      remark ||
      data?.rmk ||
      data?.Error ||
      JSON.stringify(data).slice(0, 400);
    throw new Error(`Delhivery did not return AWB: ${msg}`);
  }

  if (failed && remark && !/success/i.test(String(remark))) {
    // Some success responses still include a remarks string — only throw hard errors
    if (/error|fail|invalid|not exist|not serviceable/i.test(String(remark))) {
      throw new Error(`Delhivery: ${remark}`);
    }
  }

  return {
    awb: String(awb),
    trackingUrl: trackingUrlForAwb(awb),
    remark: String(remark || ''),
    raw: data,
  };
}

/**
 * Cancel a manifested / in-transit package by waybill (AWB).
 * POST /api/p/edit  { waybill, cancellation: "true" }
 * Docs: https://delhivery-express-api-doc.readme.io/reference/cancel-order-api
 */
export async function cancelShipment(awb) {
  const waybill = String(awb || '').trim();
  if (!waybill) throw new Error('AWB / waybill is required to cancel');

  const url = `${baseUrl()}/api/p/edit`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      waybill,
      cancellation: 'true',
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Delhivery cancel returned non-JSON (${res.status}): ${text.slice(0, 240)}`);
  }

  if (!res.ok) {
    throw new Error(
      data?.rmk ||
        data?.Error ||
        data?.message ||
        data?.error ||
        `Delhivery cancel HTTP ${res.status}`,
    );
  }

  // Common failure shapes still return HTTP 200
  const status = String(data?.status || data?.Status || '').toLowerCase();
  const remark = String(
    data?.remark || data?.remarks || data?.rmk || data?.message || '',
  );
  const failed =
    data?.success === false ||
    status === 'failure' ||
    status === 'fail' ||
    /error|fail|invalid|cannot|not allowed|already/i.test(remark);

  if (failed && !/success|cancelled|canceled|returned/i.test(remark)) {
    throw new Error(remark || 'Delhivery could not cancel this shipment');
  }

  return {
    awb: waybill,
    remark: remark || 'Cancelled',
    raw: data,
  };
}

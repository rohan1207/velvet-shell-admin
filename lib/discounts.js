import { createAdminSupabase } from '@/lib/supabase';

function normalizeCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function deriveStatus(row) {
  const now = Date.now();
  const ends = row.ends_at ? new Date(row.ends_at).getTime() : null;
  if (row.status === 'paused' || row.status === 'draft') return row.status;
  if (ends && ends < now) return 'expired';
  if (row.status === 'active' && row.active !== false) return 'active';
  return row.status || 'draft';
}

function mapCode(row, stats = {}) {
  return {
    id: row.id,
    kind: 'code',
    code: row.code,
    name: row.name || row.code,
    description: row.description || '',
    discountType: row.discount_type,
    value: row.value,
    scope: row.scope,
    scopeValues: Array.isArray(row.scope_values) ? row.scope_values : [],
    minOrderAmount: row.min_order_amount || 0,
    maxUses: row.max_uses,
    maxUsesPerCustomer: row.max_uses_per_customer,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: deriveStatus(row),
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timesUsed: stats.timesUsed || 0,
    revenue: stats.revenue || 0,
    discountGiven: stats.discountGiven || 0,
  };
}

function mapBulk(row, stats = {}) {
  return {
    id: row.id,
    kind: 'bulk',
    name: row.name,
    description: row.description || '',
    scope: row.scope,
    scopeValues: Array.isArray(row.scope_values) ? row.scope_values : [],
    tiers: Array.isArray(row.tiers) ? row.tiers : [],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: deriveStatus(row),
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timesUsed: stats.timesUsed || 0,
    revenue: stats.revenue || 0,
    discountGiven: stats.discountGiven || 0,
  };
}

async function codeStats(db, ids) {
  if (!ids.length) return new Map();
  const { data, error } = await db
    .from('discount_redemptions')
    .select('discount_id, discount_amount, order_total')
    .in('discount_id', ids);
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    const cur = map.get(row.discount_id) || { timesUsed: 0, revenue: 0, discountGiven: 0 };
    cur.timesUsed += 1;
    cur.revenue += Number(row.order_total) || 0;
    cur.discountGiven += Number(row.discount_amount) || 0;
    map.set(row.discount_id, cur);
  }
  return map;
}

async function bulkStats(db, ids) {
  if (!ids.length) return new Map();
  const { data, error } = await db
    .from('bulk_discount_redemptions')
    .select('bulk_discount_id, discount_amount, order_total')
    .in('bulk_discount_id', ids);
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    const cur = map.get(row.bulk_discount_id) || {
      timesUsed: 0,
      revenue: 0,
      discountGiven: 0,
    };
    cur.timesUsed += 1;
    cur.revenue += Number(row.order_total) || 0;
    cur.discountGiven += Number(row.discount_amount) || 0;
    map.set(row.bulk_discount_id, cur);
  }
  return map;
}

export async function listAllDiscounts() {
  const db = createAdminSupabase();
  const [{ data: codes, error: cErr }, { data: bulks, error: bErr }] = await Promise.all([
    db.from('discount_codes').select('*').order('created_at', { ascending: false }),
    db.from('bulk_discounts').select('*').order('created_at', { ascending: false }),
  ]);
  if (cErr) throw cErr;
  if (bErr) throw bErr;

  const cStats = await codeStats(
    db,
    (codes || []).map((r) => r.id)
  );
  const bStats = await bulkStats(
    db,
    (bulks || []).map((r) => r.id)
  );

  const rows = [
    ...(codes || []).map((r) => mapCode(r, cStats.get(r.id))),
    ...(bulks || []).map((r) => mapBulk(r, bStats.get(r.id))),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const active = rows.filter((r) => r.status === 'active');
  const past = rows.filter((r) => ['expired', 'paused'].includes(r.status));
  const totals = rows.reduce(
    (acc, r) => {
      acc.timesUsed += r.timesUsed;
      acc.revenue += r.revenue;
      acc.discountGiven += r.discountGiven;
      return acc;
    },
    { timesUsed: 0, revenue: 0, discountGiven: 0 }
  );

  return { rows, active, past, totals };
}

export async function getDiscount(kind, id) {
  const db = createAdminSupabase();
  if (kind === 'bulk') {
    const { data, error } = await db.from('bulk_discounts').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const stats = await bulkStats(db, [id]);
    return mapBulk(data, stats.get(id));
  }
  const { data, error } = await db.from('discount_codes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const stats = await codeStats(db, [id]);
  return mapCode(data, stats.get(id));
}

export async function upsertPromoCode(payload) {
  const db = createAdminSupabase();
  const code = normalizeCode(payload.code);
  if (!code || code.length < 3) {
    throw Object.assign(new Error('Code must be at least 3 characters.'), { status: 400 });
  }
  const value = Math.max(0, Number(payload.value) || 0);
  if (payload.discountType === 'percent' && (value < 1 || value > 100)) {
    throw Object.assign(new Error('Percent must be between 1 and 100.'), { status: 400 });
  }
  if (payload.discountType === 'fixed' && value < 1) {
    throw Object.assign(new Error('Fixed amount must be at least ₹1.'), { status: 400 });
  }

  const row = {
    code,
    name: String(payload.name || code).trim(),
    description: String(payload.description || ''),
    discount_type: payload.discountType === 'fixed' ? 'fixed' : 'percent',
    value,
    scope: ['all', 'category', 'collection', 'products'].includes(payload.scope)
      ? payload.scope
      : 'all',
    scope_values: Array.isArray(payload.scopeValues) ? payload.scopeValues : [],
    min_order_amount: Math.max(0, Number(payload.minOrderAmount) || 0),
    max_uses: payload.maxUses === '' || payload.maxUses == null ? null : Number(payload.maxUses),
    max_uses_per_customer:
      payload.maxUsesPerCustomer === '' || payload.maxUsesPerCustomer == null
        ? null
        : Number(payload.maxUsesPerCustomer),
    starts_at: payload.startsAt || new Date().toISOString(),
    ends_at: payload.endsAt || null,
    status: payload.status || 'active',
    active: payload.active !== false,
    updated_at: new Date().toISOString(),
  };

  if (payload.id) {
    const { data, error } = await db
      .from('discount_codes')
      .update(row)
      .eq('id', payload.id)
      .select('*')
      .single();
    if (error) throw error;
    return mapCode(data);
  }

  const { data, error } = await db.from('discount_codes').insert(row).select('*').single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw Object.assign(new Error('That code already exists.'), { status: 409 });
    }
    throw error;
  }
  return mapCode(data);
}

export async function upsertBulkDiscount(payload) {
  const db = createAdminSupabase();
  const name = String(payload.name || '').trim();
  if (!name) throw Object.assign(new Error('Name is required.'), { status: 400 });

  const tiers = (Array.isArray(payload.tiers) ? payload.tiers : [])
    .map((t) => ({
      qty: Math.max(2, Number(t.qty) || 2),
      discountType: t.discountType === 'fixed' ? 'fixed' : 'percent',
      value: Math.max(0, Number(t.value) || 0),
    }))
    .filter((t) => t.value > 0)
    .sort((a, b) => a.qty - b.qty);

  if (!tiers.length) {
    throw Object.assign(new Error('Add at least one bulk tier (e.g. buy 2 → 10% off).'), {
      status: 400,
    });
  }

  const row = {
    name,
    description: String(payload.description || ''),
    scope: ['all', 'category', 'collection', 'products'].includes(payload.scope)
      ? payload.scope
      : 'all',
    scope_values: Array.isArray(payload.scopeValues) ? payload.scopeValues : [],
    tiers,
    starts_at: payload.startsAt || new Date().toISOString(),
    ends_at: payload.endsAt || null,
    status: payload.status || 'active',
    active: payload.active !== false,
    updated_at: new Date().toISOString(),
  };

  if (payload.id) {
    const { data, error } = await db
      .from('bulk_discounts')
      .update(row)
      .eq('id', payload.id)
      .select('*')
      .single();
    if (error) throw error;
    return mapBulk(data);
  }

  const { data, error } = await db.from('bulk_discounts').insert(row).select('*').single();
  if (error) throw error;
  return mapBulk(data);
}

export async function deleteDiscount(kind, id) {
  const db = createAdminSupabase();
  const table = kind === 'bulk' ? 'bulk_discounts' : 'discount_codes';
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}

export function randomCode(prefix = 'VS') {
  const chunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${chunk}`;
}

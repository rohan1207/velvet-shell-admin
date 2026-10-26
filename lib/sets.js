import { createAdminSupabase } from '@/lib/supabase';
import { normalizeShipping } from '@/lib/shipping';
import { slugify } from '@/lib/format';
import { normalizeGallery } from '@/lib/catalog';

function mapItemRow(row) {
  const family = row.product_families || null;
  const variant = row.product_color_variants || null;
  const price = Number(variant?.price) || 0;
  const stock = Number(variant?.stock);
  const out =
    variant?.out_of_stock === true ||
    (Number.isFinite(stock) && stock <= 0);
  return {
    id: row.id,
    familyId: row.family_id,
    variantId: row.variant_id,
    sortOrder: row.sort_order || 0,
    familySlug: family?.slug || '',
    familyName: family?.name || '',
    familyCategory: family?.category || '',
    variantSlug: variant?.slug || '',
    colorLabel: variant?.color_label || '',
    price,
    stock: Number.isFinite(stock) ? stock : null,
    outOfStock: out,
    heroUrl: variant?.hero_url || '',
  };
}

function computeFromItems(items, priceOverride) {
  const members = items || [];
  const sum = members.reduce((s, m) => s + (Number(m.price) || 0), 0);
  const override =
    priceOverride === null || priceOverride === undefined || priceOverride === ''
      ? null
      : Math.max(0, Number(priceOverride));
  const price = override != null && !Number.isNaN(override) ? override : sum;
  const outOfStock = members.length
    ? members.some((m) => m.outOfStock)
    : false;
  const availableCount = members.filter((m) => !m.outOfStock).length;
  return {
    membersSum: sum,
    price,
    priceOverride: override,
    outOfStock,
    availableCount,
    memberCount: members.length,
  };
}

function mapSetRow(row, items = []) {
  const mappedItems = items.map(mapItemRow);
  const computed = computeFromItems(mappedItems, row.price_override);
  return {
    id: row.id,
    setCode: row.set_code || '',
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    material: row.material || '',
    design: row.design || '',
    typeLabel: row.type_label || '',
    colour: row.colour || '',
    setSku: row.set_sku || '',
    priceOverride: row.price_override,
    heroUrl: row.hero_url || '',
    gallery: normalizeGallery(row.gallery),
    shipping: normalizeShipping(row.shipping),
    badge: row.badge || '',
    status: row.status || 'draft',
    active: row.active !== false,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: mappedItems,
    ...computed,
  };
}

async function loadItems(db, setIds) {
  if (!setIds.length) return new Map();
  const { data, error } = await db
    .from('product_set_items')
    .select(
      '*, product_families(id,slug,name,category), product_color_variants(id,slug,color_label,price,stock,out_of_stock,hero_url)',
    )
    .in('set_id', setIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    const list = map.get(row.set_id) || [];
    list.push(row);
    map.set(row.set_id, list);
  }
  return map;
}

export async function listSets() {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from('product_sets')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  const ids = (data || []).map((r) => r.id);
  const itemsBySet = await loadItems(db, ids);
  return (data || []).map((row) => mapSetRow(row, itemsBySet.get(row.id) || []));
}

export async function getSet(idOrSlug) {
  const db = createAdminSupabase();
  let { data: row, error } = await db
    .from('product_sets')
    .select('*')
    .eq('id', idOrSlug)
    .maybeSingle();
  if (error) throw error;
  if (!row) {
    const bySlug = await db
      .from('product_sets')
      .select('*')
      .eq('slug', idOrSlug)
      .maybeSingle();
    if (bySlug.error) throw bySlug.error;
    row = bySlug.data;
  }
  if (!row) return null;
  const itemsBySet = await loadItems(db, [row.id]);
  return mapSetRow(row, itemsBySet.get(row.id) || []);
}

/** Product picker source — families with primary (or first) variant. */
export async function listSelectableProducts() {
  const db = createAdminSupabase();
  const { data: families, error } = await db
    .from('product_families')
    .select('id,slug,name,category,status,active')
    .neq('category', 'sets')
    .order('name', { ascending: true });
  if (error) throw error;
  const ids = (families || []).map((f) => f.id);
  if (!ids.length) return [];
  const { data: variants, error: vErr } = await db
    .from('product_color_variants')
    .select('id,family_id,slug,color_label,price,stock,out_of_stock,hero_url,is_primary,active')
    .in('family_id', ids)
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (vErr) throw vErr;
  const byFamily = new Map();
  for (const v of variants || []) {
    const list = byFamily.get(v.family_id) || [];
    list.push(v);
    byFamily.set(v.family_id, list);
  }
  return (families || [])
    .filter((f) => f.active !== false)
    .map((f) => {
      const vs = byFamily.get(f.id) || [];
      const primary = vs.find((v) => v.is_primary) || vs[0];
      if (!primary) return null;
      return {
        familyId: f.id,
        familySlug: f.slug,
        name: f.name,
        category: f.category,
        variantId: primary.id,
        variantSlug: primary.slug,
        colorLabel: primary.color_label || '',
        price: Number(primary.price) || 0,
        stock: Number(primary.stock) || 0,
        outOfStock: !!primary.out_of_stock || Number(primary.stock) <= 0,
        heroUrl: primary.hero_url || '',
        variants: vs.map((v) => ({
          id: v.id,
          slug: v.slug,
          colorLabel: v.color_label || '',
          price: Number(v.price) || 0,
          stock: Number(v.stock) || 0,
          outOfStock: !!v.out_of_stock || Number(v.stock) <= 0,
          heroUrl: v.hero_url || '',
        })),
      };
    })
    .filter(Boolean);
}

export async function upsertSet(payload) {
  const db = createAdminSupabase();
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Name is required');
  let slug = String(payload.slug || slugify(name)).trim() || slugify(name);
  slug = slugify(slug);

  const gallery = normalizeGallery(payload.gallery);
  const heroUrl =
    String(payload.heroUrl || '').trim() || gallery[0]?.url || '';

  const priceOverrideRaw = payload.priceOverride;
  const priceOverride =
    priceOverrideRaw === null ||
    priceOverrideRaw === undefined ||
    priceOverrideRaw === ''
      ? null
      : Math.max(0, Math.round(Number(priceOverrideRaw) || 0));

  const row = {
    set_code: String(payload.setCode || '').trim() || null,
    slug,
    name,
    description: String(payload.description || '').trim(),
    material: String(payload.material || '').trim(),
    design: String(payload.design || '').trim(),
    type_label: String(payload.typeLabel || '').trim(),
    colour: String(payload.colour || '').trim(),
    set_sku: String(payload.setSku || '').trim(),
    price_override: priceOverride,
    hero_url: heroUrl,
    gallery,
    shipping: normalizeShipping(payload.shipping),
    badge: String(payload.badge || '').trim(),
    status: payload.status === 'active' ? 'active' : 'draft',
    active: payload.active !== false,
    sort_order: Number(payload.sortOrder) || 0,
    updated_at: new Date().toISOString(),
  };

  let setId = payload.id || null;
  if (setId) {
    const { data, error } = await db
      .from('product_sets')
      .update(row)
      .eq('id', setId)
      .select('*')
      .single();
    if (error) throw error;
    setId = data.id;
  } else {
    const { data, error } = await db
      .from('product_sets')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    setId = data.id;
  }

  const itemsIn = Array.isArray(payload.items) ? payload.items : [];
  await db.from('product_set_items').delete().eq('set_id', setId);

  const seen = new Set();
  const itemRows = [];
  for (let i = 0; i < itemsIn.length; i += 1) {
    const it = itemsIn[i];
    const familyId = it.familyId || it.family_id;
    if (!familyId || seen.has(familyId)) continue;
    seen.add(familyId);
    itemRows.push({
      set_id: setId,
      family_id: familyId,
      variant_id: it.variantId || it.variant_id || null,
      sort_order: i,
    });
  }
  if (itemRows.length) {
    const { error: iErr } = await db.from('product_set_items').insert(itemRows);
    if (iErr) throw iErr;
  }

  return getSet(setId);
}

export async function deleteSet(id) {
  const db = createAdminSupabase();
  const { error } = await db.from('product_sets').delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}

export async function deleteAllSetsAndLegacyFamilies() {
  const db = createAdminSupabase();
  await db.from('product_sets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { data: fams } = await db
    .from('product_families')
    .select('id')
    .eq('category', 'sets');
  for (const f of fams || []) {
    await db.from('product_color_variants').delete().eq('family_id', f.id);
  }
  if (fams?.length) {
    await db.from('product_families').delete().eq('category', 'sets');
  }
  return { deletedFamilies: fams?.length || 0 };
}

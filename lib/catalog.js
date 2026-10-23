import { createAdminSupabase } from '@/lib/supabase';
import { normalizeShipping } from '@/lib/shipping';
import { slugify } from '@/lib/format';

/** Size pills shown on the storefront Measure row. */
export function normalizeSizeTags(tags, lengthLabel = '') {
  const fromArray = Array.isArray(tags)
    ? tags.map((t) => String(t || '').trim()).filter(Boolean)
    : [];
  if (fromArray.length) return [...new Set(fromArray)];
  const length = String(lengthLabel || '').trim();
  return length ? [length] : [];
}

export function normalizeCustomizationFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field, index) => {
      const label = String(field?.label || '').trim();
      if (!label) return null;
      const inputType = ['text', 'number', 'textarea'].includes(field?.inputType)
        ? field.inputType
        : 'text';
      return {
        id: String(field?.id || `field_${index + 1}`).trim() || `field_${index + 1}`,
        label,
        inputType,
        required: !!field?.required,
        placeholder: String(field?.placeholder || '').trim(),
      };
    })
    .filter(Boolean);
}

function mapFamilyRow(row, variants = []) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    collection: row.collection_slug || '',
    hasColorVariants: !!row.has_color_variants,
    customizationEnabled: !!row.customization_enabled,
    customizationFields: normalizeCustomizationFields(row.customization_fields),
    shipping: normalizeShipping(row.shipping),
    recommendedFamilyIds: Array.isArray(row.recommended_family_ids)
      ? row.recommended_family_ids
      : [],
    badge: row.badge || '',
    status: row.status || 'draft',
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants: variants.map(mapVariantRow),
  };
}

function mapVariantRow(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    slug: row.slug,
    colorLabel: row.color_label || 'Default',
    colorSwatch: row.color_swatch || '#C5C5C5',
    isPrimary: !!row.is_primary,
    price: row.price || 0,
    description: row.description || '',
    story: row.story || '',
    care: row.care || '',
    features: Array.isArray(row.features) ? row.features : [],
    material: row.material || '',
    length: row.length_label || '',
    sizeTags: normalizeSizeTags(row.size_tags, row.length_label),
    reviews: {
      rating: Number(row.reviews?.rating || 0),
      count: Number(row.reviews?.count || 0),
      highlights: Array.isArray(row.reviews?.highlights) ? row.reviews.highlights : [],
    },
    heroUrl: row.hero_url || '',
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    stock: row.stock || 0,
    outOfStock: !!row.out_of_stock,
    active: row.active !== false,
    sortOrder: row.sort_order || 0,
  };
}

export async function listFamilies() {
  const db = createAdminSupabase();
  const { data: families, error } = await db
    .from('product_families')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const { data: variants, error: vErr } = await db
    .from('product_color_variants')
    .select('*')
    .order('sort_order', { ascending: true });
  if (vErr) throw vErr;

  const byFamily = new Map();
  for (const v of variants || []) {
    const list = byFamily.get(v.family_id) || [];
    list.push(v);
    byFamily.set(v.family_id, list);
  }

  return (families || []).map((f) => mapFamilyRow(f, byFamily.get(f.id) || []));
}

export async function getFamily(idOrSlug) {
  const db = createAdminSupabase();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idOrSlug
    );

  let query = db.from('product_families').select('*');
  query = isUuid ? query.eq('id', idOrSlug) : query.eq('slug', idOrSlug);
  const { data: family, error } = await query.maybeSingle();
  if (error) throw error;
  if (!family) return null;

  const { data: variants, error: vErr } = await db
    .from('product_color_variants')
    .select('*')
    .eq('family_id', family.id)
    .order('sort_order', { ascending: true });
  if (vErr) throw vErr;

  return mapFamilyRow(family, variants || []);
}

export async function listCategories() {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from('shop_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((c) => ({
    slug: c.slug,
    name: c.name,
    line: c.line || '',
    bannerUrl: c.banner_url || '',
    sortOrder: c.sort_order || 0,
    active: c.active !== false,
  }));
}

export async function listCollections() {
  const db = createAdminSupabase();
  const { data, error } = await db.from('collections').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((c) => ({
    slug: c.slug,
    name: c.name,
    line: c.line || '',
  }));
}

export async function saveCategory(input) {
  const db = createAdminSupabase();
  const slug = slugify(input.slug || input.name);
  const { data, error } = await db
    .from('shop_categories')
    .upsert(
      {
        slug,
        name: String(input.name || '').trim(),
        line: String(input.line || ''),
        banner_url: String(input.bannerUrl || ''),
        sort_order: Number(input.sortOrder) || 0,
        active: input.active !== false,
      },
      { onConflict: 'slug' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

function emptyVariant(label = 'Default', swatch = '#C5C5C5') {
  return {
    id: `tmp-${Math.random().toString(36).slice(2, 9)}`,
    colorLabel: label,
    colorSwatch: swatch,
    isPrimary: true,
    price: 0,
    description: '',
    features: [],
    material: '',
    length: '',
    sizeTags: [],
    reviews: { rating: 0, count: 0, highlights: [] },
    heroUrl: '',
    gallery: [],
    stock: 10,
    outOfStock: false,
    active: true,
    sortOrder: 0,
  };
}

export function blankFamily() {
  return {
    id: null,
    slug: '',
    name: '',
    category: 'rings',
    collection: 'the-shell-edit',
    hasColorVariants: false,
    customizationEnabled: false,
    customizationFields: [],
    shipping: normalizeShipping(null),
    recommendedFamilyIds: [],
    badge: '',
    status: 'draft',
    active: true,
    variants: [emptyVariant()],
  };
}

export async function upsertFamily(payload) {
  const db = createAdminSupabase();
  const name = String(payload.name || '').trim();
  if (!name) throw Object.assign(new Error('Name is required'), { status: 400 });

  const familySlug = slugify(payload.slug || name);
  const hasColor = !!payload.hasColorVariants;
  let variants = Array.isArray(payload.variants) ? payload.variants : [];
  if (!variants.length) variants = [emptyVariant()];
  if (!hasColor) {
    variants = [
      {
        ...variants[0],
        colorLabel: variants[0].colorLabel || 'Default',
        isPrimary: true,
      },
    ];
  }

  // Ensure one primary
  if (!variants.some((v) => v.isPrimary)) variants[0].isPrimary = true;

  const customizationEnabled = !!payload.customizationEnabled;
  const customizationFields = customizationEnabled
    ? normalizeCustomizationFields(payload.customizationFields)
    : [];

  const familyRow = {
    slug: familySlug,
    name,
    category: payload.category,
    collection_slug: payload.collection || null,
    has_color_variants: hasColor,
    customization_enabled: customizationEnabled,
    customization_fields: customizationFields,
    shipping: normalizeShipping(payload.shipping),
    recommended_family_ids: payload.recommendedFamilyIds || [],
    badge: payload.badge || '',
    status: payload.status === 'active' ? 'active' : 'draft',
    active: payload.active !== false,
    updated_at: new Date().toISOString(),
  };

  let familyId = payload.id || null;

  if (familyId) {
    const { error } = await db.from('product_families').update(familyRow).eq('id', familyId);
    if (error) throw error;
  } else {
    const { data, error } = await db
      .from('product_families')
      .insert(familyRow)
      .select('id')
      .single();
    if (error) throw error;
    familyId = data.id;
  }

  // Replace variants: delete removed, upsert current
  const { data: existing } = await db
    .from('product_color_variants')
    .select('id')
    .eq('family_id', familyId);
  const keepIds = new Set(
    variants.map((v) => v.id).filter((id) => id && !String(id).startsWith('tmp-'))
  );
  const toDelete = (existing || []).filter((r) => !keepIds.has(r.id)).map((r) => r.id);
  if (toDelete.length) {
    await db.from('product_color_variants').delete().in('id', toDelete);
  }

  for (let i = 0; i < variants.length; i += 1) {
    const v = variants[i];
    const colorPart = hasColor ? slugify(v.colorLabel || `color-${i + 1}`) : 'default';
    const variantSlug =
      slugify(v.slug) || (hasColor ? `${familySlug}-${colorPart}` : familySlug);

    const sizeTags = normalizeSizeTags(v.sizeTags, v.length);
    const featureList = Array.isArray(v.features)
      ? v.features
      : String(v.features || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
    const galleryList = Array.isArray(v.gallery)
      ? v.gallery.filter((g) => g && g.url)
      : [];

    const variantRow = {
      family_id: familyId,
      slug: variantSlug,
      color_label: v.colorLabel || (hasColor ? `Color ${i + 1}` : 'Default'),
      color_swatch: v.colorSwatch || '#C5C5C5',
      is_primary: !!v.isPrimary,
      price: Math.max(0, Number(v.price) || 0),
      description: v.description || '',
      story: v.story || '',
      care: v.care || '',
      features: featureList,
      material: v.material || '',
      length_label: sizeTags[0] || String(v.length || '').trim() || '',
      size_tags: sizeTags,
      reviews: {
        rating: Math.min(5, Math.max(0, Number(v.reviews && v.reviews.rating) || 0)),
        count: Math.max(0, Number(v.reviews && v.reviews.count) || 0),
        highlights:
          v.reviews && Array.isArray(v.reviews.highlights) ? v.reviews.highlights : [],
      },
      hero_url: v.heroUrl || '',
      gallery: galleryList,
      stock: Math.max(0, Number(v.stock) || 0),
      out_of_stock: !!v.outOfStock,
      active: v.active !== false,
      sort_order: i,
      updated_at: new Date().toISOString(),
    };

    const existingId = v.id && !String(v.id).startsWith('tmp-') ? v.id : null;
    if (existingId) {
      const updated = await db
        .from('product_color_variants')
        .update(variantRow)
        .eq('id', existingId);
      if (updated.error) throw updated.error;
    } else {
      const inserted = await db.from('product_color_variants').insert(variantRow);
      if (inserted.error) throw inserted.error;
    }
  }

  return getFamily(familyId);
}

export async function deleteFamily(id) {
  const db = createAdminSupabase();
  const { error } = await db.from('product_families').delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}

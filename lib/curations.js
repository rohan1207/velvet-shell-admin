import { createAdminSupabase } from '@/lib/supabase';

const DEFAULTS = {
  'festive-edit': {
    slug: 'festive-edit',
    eyebrow: 'Seasonal',
    title: 'Festive Edit',
    line: 'A celebratory selection — blooms, metals and forms for the season’s quiet shine.',
    productSlugs: [],
  },
  'best-sellers': {
    slug: 'best-sellers',
    eyebrow: 'Best sellers',
    title: 'Best of Velvet Shell',
    line: 'The pieces guests return for — a quiet house edit across form and metal.',
    productSlugs: [],
  },
};

function mapRow(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    eyebrow: row.eyebrow || '',
    title: row.title || '',
    line: row.line || '',
    productSlugs: Array.isArray(row.product_slugs) ? row.product_slugs.map(String) : [],
    updatedAt: row.updated_at || null,
  };
}

export async function getCuration(slug) {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from('homepage_curations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (data) return mapRow(data);
  return { ...DEFAULTS[slug], slug };
}

export async function listCurations() {
  const db = createAdminSupabase();
  const { data, error } = await db.from('homepage_curations').select('*').order('slug');
  if (error) throw error;
  const rows = (data || []).map(mapRow);
  const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
  return ['festive-edit', 'best-sellers'].map(
    (slug) => bySlug[slug] || { ...DEFAULTS[slug], slug }
  );
}

export async function saveCuration(slug, input) {
  if (!DEFAULTS[slug]) {
    const err = new Error('Unknown curation');
    err.status = 400;
    throw err;
  }
  const productSlugs = [...new Set((input.productSlugs || []).map(String).filter(Boolean))];
  const row = {
    slug,
    eyebrow: String(input.eyebrow ?? DEFAULTS[slug].eyebrow).trim(),
    title: String(input.title ?? DEFAULTS[slug].title).trim(),
    line: String(input.line ?? DEFAULTS[slug].line).trim(),
    product_slugs: productSlugs,
    updated_at: new Date().toISOString(),
  };
  const db = createAdminSupabase();
  const { data, error } = await db
    .from('homepage_curations')
    .upsert(row, { onConflict: 'slug' })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow(data);
}

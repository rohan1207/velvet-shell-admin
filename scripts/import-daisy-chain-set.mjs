/**
 * Import Daisy Fine Chain Link necklace + ring + bracelet, then link into the Daisy set.
 *
 * Images from public/final_products_combined/… (white.png preferred as hero).
 *
 *   node --env-file=.env.local --env-file=admin/.env.local admin/scripts/import-daisy-chain-set.mjs
 */
import {
  readdirSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  statSync,
  rmSync,
} from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname, basename } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const FINAL = join(root, 'public', 'final_products_combined');
const DEST = join(root, 'public', 'products');
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;
const COLOR_HERO = /^(gold|silver|white)(\.[^.]+)?$/i;

const PIECES = [
  {
    name: 'Daisy Necklace with Fine Chain Links',
    category: 'necklaces',
    type: 'Necklace',
    design: 'Daisy Floral Design with Fine Chain Links',
    description:
      'A delicate 925 sterling silver Daisy necklace featuring an elegant floral design with fine chain-link detailing. Designed to add a subtle touch of sophistication, this necklace offers a timeless and effortless look, perfect for everyday styling or special occasions.',
    sku: 'YWJE0076',
    price: 4999,
    stock: 5,
    srcDir: join(FINAL, 'Necklace', 'Daisy Necklace with Fine Chain Links', 'YWJE0076'),
  },
  {
    name: 'Daisy Ring with Fine Chain Links',
    category: 'rings',
    type: 'Ring',
    design: 'Daisy Floral Design with Fine Detailing',
    description:
      'A beautifully crafted 925 sterling silver Daisy ring featuring a delicate floral-inspired design with fine detailing. Its elegant and minimal aesthetic makes it a perfect statement of understated charm, whether worn alone or paired with your favourite jewellery.',
    sku: 'YWJE0077',
    price: 3499,
    stock: 5,
    srcDir: join(FINAL, 'Rings', 'Daisy Ring with Fine Chain Links', 'YWJE0077'),
  },
  {
    name: 'Daisy Bracelet with Fine Chain Links',
    category: 'bracelets',
    type: 'Bracelet',
    design: 'Daisy Floral Design with Fine Chain Links',
    description:
      'A graceful 925 sterling silver Daisy bracelet featuring a charming floral design complemented by fine chain-link detailing. Delicate yet distinctive, this bracelet adds a refined touch to your wrist and pairs effortlessly with both casual and occasion wear.',
    sku: 'YWJE0075',
    price: 3999,
    stock: 5,
    srcDir: join(FINAL, 'Braceletes', 'Daisy Bracelet with Fine Chain Links', 'YWJE0075'),
  },
];

const SET = {
  setCode: 'S02',
  slug: 'daisy-necklace-ring-bracelet-set-with-fine-chain-links-s02',
  name: 'Daisy Necklace, Ring & Bracelet Set with Fine Chain Links',
  description:
    'A coordinated 925 sterling silver Daisy jewellery set featuring a necklace, ring and bracelet designed with fine chain-link detailing. The matching pieces create a polished, effortless look when worn together, while each can also be styled separately.',
  colour: 'Silver',
  material: '925 Sterling Silver',
  typeLabel: 'Necklace, Ring & Bracelet Set',
  design: 'Fine Chain Link',
  setSku: '',
  srcDir: join(
    FINAL,
    'sets',
    'Daisy Necklace, Ring & Bracelet Set with Fine Chain Links',
  ),
};

function env(n) {
  return process.env[n] || '';
}

function headers(prefer = 'return=representation') {
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

function base() {
  return `${env('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')}/rest/v1`;
}

async function api(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: headers(prefer),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(
      `${method} ${path}: ${res.status} ${typeof data === 'object' ? JSON.stringify(data) : text}`,
    );
  }
  return data;
}

function slugify(text = '') {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72) || 'item'
  );
}

function natSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isFile() && IMAGE_EXT.test(name)) files.push(full);
  }
  const heroes = files
    .filter((f) => COLOR_HERO.test(basename(f).toLowerCase()))
    .sort((a, b) => natSort(a, b));
  const rest = files
    .filter((f) => !COLOR_HERO.test(basename(f).toLowerCase()))
    .sort((a, b) => natSort(a, b));
  return [...heroes, ...rest];
}

function copyMedia(srcDir, category, destSlug) {
  const files = listImages(srcDir);
  if (!files.length) {
    return { heroUrl: '', gallery: [], count: 0 };
  }
  const destDir = join(DEST, category, destSlug);
  if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  const urls = [];
  files.forEach((src, i) => {
    const ext = extname(src).toLowerCase() || '.jpg';
    const name = `${String(i + 1).padStart(2, '0')}${ext}`;
    copyFileSync(src, join(destDir, name));
    urls.push(`/products/${category}/${destSlug}/${name}`);
  });
  return {
    heroUrl: urls[0],
    gallery: urls.map((u, i) => ({ url: u, kind: 'image', sort: i })),
    count: urls.length,
    heroFile: basename(files[0]),
  };
}

async function deleteFamilyById(id) {
  await api(`/product_set_items?family_id=eq.${id}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  }).catch(() => {});
  await api(`/product_color_variants?family_id=eq.${id}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
  await api(`/product_families?id=eq.${id}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

async function findFamiliesForSku(sku) {
  const rows = await api(
    `/product_color_variants?select=id,family_id,features&features=cs.["SKU ${sku}"]&limit=50`,
  );
  return [...new Set((rows || []).map((r) => r.family_id).filter(Boolean))];
}

async function findFamilyBySlug(slug) {
  const rows = await api(
    `/product_families?slug=eq.${encodeURIComponent(slug)}&select=id,slug`,
  );
  return rows?.[0] || null;
}

async function upsertPiece(piece) {
  const familySlug = slugify(`${piece.name}-${piece.sku.toLowerCase()}`);
  const media = copyMedia(piece.srcDir, piece.category, familySlug);
  console.log(
    `  media ${piece.sku}: ${media.count} imgs · hero=${media.heroFile || 'none'} → ${media.heroUrl || '(empty)'}`,
  );

  // Remove prior rows for this SKU / slug so we don't duplicate
  for (const id of await findFamiliesForSku(piece.sku)) {
    console.log(`  delete prior family for SKU ${piece.sku}: ${id}`);
    await deleteFamilyById(id);
  }
  const bySlug = await findFamilyBySlug(familySlug);
  if (bySlug?.id) {
    console.log(`  delete prior slug ${familySlug}`);
    await deleteFamilyById(bySlug.id);
  }

  const inserted = await api('/product_families', {
    method: 'POST',
    body: {
      slug: familySlug,
      name: piece.name,
      category: piece.category,
      collection_slug: 'the-shell-edit',
      has_color_variants: false,
      shipping: {},
      recommended_family_ids: [],
      badge: piece.type,
      status: 'active',
      active: true,
      updated_at: new Date().toISOString(),
    },
  });
  const family = Array.isArray(inserted) ? inserted[0] : inserted;

  const features = [
    `SKU ${piece.sku}`,
    piece.type,
    `Design: ${piece.design}`,
    '925 Sterling Silver',
    'Finish: Sterling Silver',
    'Colour: Silver',
  ];

  const variant = await api('/product_color_variants', {
    method: 'POST',
    body: {
      family_id: family.id,
      slug: familySlug,
      color_label: 'Silver',
      color_swatch: '#C5C5C5',
      is_primary: true,
      price: piece.price,
      description: piece.description,
      story: '',
      care: '',
      features,
      material: '925 Sterling Silver',
      length_label: 'One size',
      size_tags: ['One size'],
      reviews: { rating: 0, count: 0, highlights: [] },
      hero_url: media.heroUrl,
      gallery: media.gallery,
      stock: piece.stock,
      out_of_stock: false,
      active: true,
      sort_order: 0,
      updated_at: new Date().toISOString(),
    },
  });
  const v = Array.isArray(variant) ? variant[0] : variant;
  console.log(`  + ${piece.category} · ${family.slug} · ₹${piece.price}`);
  return { familyId: family.id, variantId: v.id, slug: family.slug, media };
}

async function upsertSet(members) {
  const setSlug = SET.slug;
  const media = copyMedia(SET.srcDir, 'sets', setSlug);
  console.log(
    `  set media: ${media.count} imgs · hero=${media.heroFile || 'none'} → ${media.heroUrl || '(empty)'}`,
  );

  const existing = await api(
    `/product_sets?or=(slug.eq.${encodeURIComponent(setSlug)},set_code.eq.${SET.setCode})&select=*`,
  );
  const row = {
    set_code: SET.setCode,
    slug: setSlug,
    name: SET.name,
    description: SET.description,
    material: SET.material,
    design: SET.design,
    type_label: SET.typeLabel,
    colour: SET.colour,
    set_sku: SET.setSku,
    price_override: null,
    hero_url: media.heroUrl,
    gallery: media.gallery,
    shipping: {},
    badge: 'Set',
    status: 'active',
    active: true,
    sort_order: 2,
    updated_at: new Date().toISOString(),
  };

  let setId;
  if (existing?.length) {
    setId = existing[0].id;
    await api(`/product_sets?id=eq.${setId}`, {
      method: 'PATCH',
      body: row,
      prefer: 'return=minimal',
    });
    console.log(`  updated product_sets ${setId}`);
  } else {
    const inserted = await api('/product_sets', { method: 'POST', body: row });
    setId = (Array.isArray(inserted) ? inserted[0] : inserted).id;
    console.log(`  created product_sets ${setId}`);
  }

  await api(`/product_set_items?set_id=eq.${setId}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });

  const itemRows = members.map((m, i) => ({
    set_id: setId,
    family_id: m.familyId,
    variant_id: m.variantId,
    sort_order: i,
  }));
  await api('/product_set_items', { method: 'POST', body: itemRows });
  console.log(`  linked ${itemRows.length} pieces`);
  return setId;
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  if (!env('NEXT_PUBLIC_SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) {
    throw new Error('Missing Supabase env');
  }

  console.log('Importing Daisy Fine Chain pieces…\n');
  const members = [];
  for (const piece of PIECES) {
    console.log(`+ ${piece.name}`);
    if (!existsSync(piece.srcDir)) {
      throw new Error(`Missing images: ${piece.srcDir}`);
    }
    members.push(await upsertPiece(piece));
  }

  console.log(`\n+ ${SET.name}`);
  if (!existsSync(SET.srcDir)) {
    throw new Error(`Missing set images: ${SET.srcDir}`);
  }
  const setId = await upsertSet(members);
  console.log(`\nDone. Set id=${setId}`);
  console.log('Pieces:', members.map((m) => m.slug).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

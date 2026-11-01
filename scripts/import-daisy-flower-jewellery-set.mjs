/**
 * Import Daisy Hoop Earrings + Daisy Pendant Necklace + live Daisy Flower Jewellery Set.
 *
 *   node --env-file=.env.local --env-file=admin/.env.local admin/scripts/import-daisy-flower-jewellery-set.mjs
 *   node --env-file=admin/.env.local --env-file=.env.local admin/scripts/upload-daisy-flower-jewellery-set-to-r2.mjs
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
    name: 'Daisy Hoop Earrings',
    category: 'earrings',
    type: 'Hoop Earrings',
    design: 'Daisy',
    description:
      'A stylish pair of 925 sterling silver hoop earrings featuring daisy-inspired detailing with zircon accents. The floral design adds a subtle statement while keeping the earrings versatile for everyday and occasion wear.',
    sku: 'YWJE0091',
    price: 1499,
    stock: 2,
    srcDir: join(FINAL, 'Earrings', 'Daisy Hoop Earrings'),
  },
  {
    name: 'Daisy Pendant Necklace',
    category: 'necklaces',
    type: 'Pendant Necklace',
    design: 'Daisy',
    description:
      'A graceful 925 sterling silver pendant necklace featuring a daisy-inspired motif with zircon detailing. The floral pendant adds a feminine touch to a classic chain, making it an easy choice for everyday styling or gifting.',
    sku: 'YWJE0092',
    price: 1999,
    stock: 1,
    srcDir: join(FINAL, 'Necklace', 'Daisy Pendant Necklace'),
  },
];

const SET = {
  setCode: 'S07',
  slug: 'daisy-flower-jewellery-set-s07',
  name: 'Daisy Flower Jewellery Set',
  description:
    'A coordinated 925 sterling silver jewellery set featuring daisy flower designs accented with sparkling zircon detailing. The set brings together feminine floral elements in a versatile style that works beautifully for everyday wear, festive occasions and gifting.',
  colour: 'Silver',
  material: '925 Sterling Silver',
  typeLabel: 'Jewellery Set',
  design: 'Daisy',
  setSku: 'YWJE0089',
  priceOverride: 1999,
  extraImagePaths: [
    join(FINAL, 'sets', 'Daisy Flower Jewellery Set'),
    join(root, 'public', 'products', 'ywje', 'YWJE0089'),
    join(FINAL, 'Necklace', 'Daisy Pendant Necklace', 'white.png'),
  ],
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

function listImagesDeep(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  function walk(d) {
    for (const name of readdirSync(d)) {
      if (name.startsWith('.')) continue;
      const full = join(d, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if (st.isFile() && IMAGE_EXT.test(name)) files.push(full);
    }
  }
  walk(dir);
  const heroes = files
    .filter((f) => COLOR_HERO.test(basename(f).toLowerCase()))
    .sort((a, b) => natSort(a, b));
  const rest = files
    .filter((f) => !COLOR_HERO.test(basename(f).toLowerCase()))
    .sort((a, b) => natSort(a, b));
  return [...heroes, ...rest];
}

function copyMediaFromFiles(files, category, destSlug) {
  if (!files.length) return { heroUrl: '', gallery: [], count: 0 };
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

function gatherPaths(paths) {
  const seen = new Set();
  const out = [];
  function push(path) {
    if (!path || !existsSync(path) || seen.has(path)) return;
    let st;
    try {
      st = statSync(path);
    } catch {
      return;
    }
    if (st.isDirectory()) {
      for (const f of listImagesDeep(path)) push(f);
      return;
    }
    if (st.isFile() && IMAGE_EXT.test(path)) {
      seen.add(path);
      out.push(path);
    }
  }
  for (const p of paths) push(p);
  out.sort((a, b) => {
    const aSet = /\bset\b/i.test(basename(a)) ? 0 : 1;
    const bSet = /\bset\b/i.test(basename(b)) ? 0 : 1;
    if (aSet !== bSet) return aSet - bSet;
    const aW = COLOR_HERO.test(basename(a).toLowerCase()) ? 0 : 1;
    const bW = COLOR_HERO.test(basename(b).toLowerCase()) ? 0 : 1;
    if (aW !== bW) return aW - bW;
    return natSort(a, b);
  });
  return out;
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
  const media = copyMediaFromFiles(listImagesDeep(piece.srcDir), piece.category, familySlug);
  console.log(
    `  media ${piece.sku}: ${media.count} imgs · hero=${media.heroFile || 'none'} → ${media.heroUrl || '(empty)'}`,
  );

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
  console.log(`  + active ${piece.category} · ${family.slug} · ₹${piece.price}`);
  return { familyId: family.id, variantId: v.id, slug: family.slug, category: piece.category };
}

async function upsertSet(members) {
  const setSlug = SET.slug;
  const media = copyMediaFromFiles(gatherPaths(SET.extraImagePaths), 'sets', setSlug);
  console.log(
    `  set media: ${media.count} imgs · hero=${media.heroFile || 'none'} → ${media.heroUrl || '(empty)'}`,
  );

  const existing = await api(
    `/product_sets?or=(slug.eq.${encodeURIComponent(setSlug)},set_code.eq.${SET.setCode},set_sku.eq.${SET.setSku})&select=*`,
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
    price_override: SET.priceOverride,
    hero_url: media.heroUrl,
    gallery: media.gallery,
    shipping: {},
    badge: 'Set',
    status: 'active',
    active: true,
    sort_order: 7,
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

  await api('/product_set_items', {
    method: 'POST',
    body: members.map((m, i) => ({
      set_id: setId,
      family_id: m.familyId,
      variant_id: m.variantId,
      sort_order: i,
    })),
  });
  console.log(`  linked ${members.length} pieces`);
  return setId;
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  if (!env('NEXT_PUBLIC_SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) {
    throw new Error('Missing Supabase env');
  }

  console.log('Importing Daisy Flower Jewellery Set (live)…\n');
  const members = [];
  for (const piece of PIECES) {
    console.log(`+ ${piece.name}`);
    if (!existsSync(piece.srcDir)) throw new Error(`Missing images: ${piece.srcDir}`);
    members.push(await upsertPiece(piece));
  }

  console.log(`\n+ ${SET.name}`);
  const setId = await upsertSet(members);
  console.log(`\nDone. Set id=${setId} (active)`);
  console.log('Pieces:', members.map((m) => m.slug).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

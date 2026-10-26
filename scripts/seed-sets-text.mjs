/**
 * Wipe legacy category=sets families + product_sets, then seed text from docs/sets-seed.json.
 *
 *   node --env-file=.env.local admin/scripts/seed-sets-text.mjs
 */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

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
      .slice(0, 72) || 'set'
  );
}

const SETS = [
  {
    set_id: 'S01',
    set_name: 'Fairy-Like Fringed Collarbone Chain Bracelet with Heart-Shaped Pearl Bead',
    set_sku: null,
    description:
      'Inspired by the lightness of fairy-like details, this 925 sterling silver bracelet features a beaded chain with a heart-shaped pearl accent and fringed detailing. A charming choice for gifting or adding a playful touch to an elegant look.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Chain & Link Bracelet',
    design: 'Fairy-Like Fringed',
    price_inr: null,
  },
  {
    set_id: 'S02',
    set_name: 'Daisy Necklace, Ring & Bracelet Set with Fine Chain Links',
    set_sku: null,
    description:
      'A coordinated 925 sterling silver Daisy jewellery set featuring a necklace, ring and bracelet designed with fine chain-link detailing. The matching pieces create a polished, effortless look when worn together, while each can also be styled separately.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Necklace, Ring & Bracelet Set',
    design: 'Fine Chain Link',
    price_inr: null,
  },
  {
    set_id: 'S03',
    set_name: 'Zircon Geometric Jewellery Set',
    set_sku: 'YWJE0082',
    description:
      'A modern 925 sterling silver jewellery set featuring geometric zircon detailing and a clean, minimal silhouette. The coordinated design brings a contemporary touch to everyday styling while also making a stylish gifting option.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Set',
    design: 'Zircon Geometric',
    price_inr: 2499,
  },
  {
    set_id: 'S04',
    set_name: 'Zircon Flower Jewellery Set',
    set_sku: 'YWJE0083',
    description:
      'A charming 925 sterling silver jewellery set featuring floral designs accented with sparkling zircon detailing. The coordinated pieces add a feminine touch to festive and occasion looks while offering the versatility of a complete jewellery set.',
    colour: 'Jewellery Set',
    material: '925 Sterling Silver',
    type: 'Set',
    design: 'Zircon Flower',
    price_inr: 2499,
  },
  {
    set_id: 'S05',
    set_name: 'Zircon Jewellery Set',
    set_sku: 'YWJE0084',
    description:
      'A complete 925 sterling silver jewellery set featuring coordinated earrings, necklace, bracelet and ring, each accented with elegant zircon detailing. The matching designs create a polished look when worn together, making this set a versatile choice for special occasions and gifting.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Zircon Princess Cut & Pearl Details',
    price_inr: 2499,
  },
  {
    set_id: 'S06',
    set_name: 'Dolphin Jewellery Set',
    set_sku: 'YWJE0088',
    description:
      'A playful 925 sterling silver jewellery set featuring charming dolphin-inspired designs. With its graceful silhouette and polished finish, this set brings a fun yet elegant touch to everyday styling and makes a thoughtful gift for those who love nature-inspired jewellery.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Dolphin',
    price_inr: 1699,
  },
  {
    set_id: 'S07',
    set_name: 'Daisy Flower Jewellery Set',
    set_sku: 'YWJE0089',
    description:
      'A coordinated 925 sterling silver jewellery set featuring daisy flower designs accented with sparkling zircon detailing. The set brings together feminine floral elements in a versatile style that works beautifully for everyday wear, festive occasions and gifting.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Daisy',
    price_inr: 1999,
  },
  {
    set_id: 'S08',
    set_name: 'Snowflake Jewellery Set',
    set_sku: 'YWJE0093',
    description:
      'A charming 925 sterling silver jewellery set featuring coordinated snowflake-inspired designs. The set brings together elegant pieces with sparkling detailing, creating a graceful winter-inspired look that works beautifully for festive occasions, parties and gifting.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Snowflake',
    price_inr: 2999,
  },
  {
    set_id: 'S09',
    set_name: 'Butterfly Jewellery Set',
    set_sku: 'YWJE0097',
    description:
      'A charming 925 sterling silver jewellery set featuring coordinated butterfly-inspired pieces, including layered necklace and bracelet designs with matching butterfly accents. The graceful motif and polished detailing create a cohesive look that works beautifully for gifting and special occasions.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Butterfly',
    price_inr: 2499,
  },
  {
    set_id: 'S11',
    set_name: 'Feather Dreamcatcher Jewellery Set',
    set_sku: null,
    description:
      'A coordinated set featuring a feather dreamcatcher bracelet, pendant necklace and drop earrings, all crafted in 925 sterling silver. The intricate dreamcatcher motif and delicate feather detailing create a graceful, bohemian-inspired look, with each piece designed to complement the others beautifully. A distinctive set for festive occasions, everyday styling or thoughtful gifting.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Feather Dreamcatcher',
    price_inr: null,
  },
  {
    set_id: 'S12',
    set_name: 'Honeybee Jewellery Set',
    set_sku: null,
    description:
      'A charming 925 sterling silver jewellery set inspired by the honeybee, featuring coordinated pieces with a playful yet sophisticated design. The distinctive bee motif makes this set a memorable choice for gifting and adds personality to both everyday and occasion looks.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Honeybee',
    price_inr: null,
  },
  {
    set_id: 'S13',
    set_name: 'Fresh Leaf Jewellery Set',
    set_sku: 'YWJE0109',
    description:
      'A nature-inspired 925 sterling silver jewellery set featuring fresh leaf motifs across coordinated pieces. The clean, graceful design brings a subtle touch of nature to your look, making it suitable for everyday styling, special occasions and thoughtful gifting.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Fresh Leaf',
    price_inr: 2499,
  },
  {
    set_id: 'S14',
    set_name: 'Snowflake Jewellery Set',
    set_sku: 'YWJE0110',
    description:
      'A sophisticated 925 sterling silver jewellery set featuring intricate snowflake-inspired designs. The coordinated pieces bring a touch of winter-inspired elegance to festive and occasion looks, while the sparkling detailing adds a refined finish.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Snowflakes',
    price_inr: 2499,
  },
  {
    set_id: 'S15',
    set_name: 'Sweet Flower Jewellery Set',
    set_sku: 'YWJE0113',
    description:
      'A coordinated 925 sterling silver jewellery set featuring a sweet flower-inspired design across the necklace, earrings, bracelet and ring. The floral detailing brings a feminine and elegant character to the set, making it a versatile choice for festive occasions, celebrations and gifting.',
    colour: 'Silver',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Sweet Flower',
    price_inr: 2999,
  },
  {
    set_id: 'S16',
    set_name: 'Green Leaves Jewellery Set',
    set_sku: 'YWJE0118',
    description:
      'A nature-inspired 925 sterling silver jewellery set featuring elegant green leaf motifs across coordinated pieces. The combination of polished silver and green accents creates a fresh, graceful look, making the set a lovely choice for everyday styling, festive occasions and gifting.',
    colour: 'Silver with Green Leaf Details',
    material: '925 Sterling Silver',
    type: 'Jewellery Set',
    design: 'Green Leaves',
    price_inr: 3499,
  },
];

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  // Ensure category row
  try {
    await api('/shop_categories', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        slug: 'sets',
        name: 'Sets',
        line: 'Complete looks',
        sort_order: 60,
        active: true,
      },
    });
  } catch {
    /* may already exist without upsert support */
  }

  // Wipe product_sets
  const existing = await api('/product_sets?select=id');
  for (const row of existing || []) {
    await api(`/product_sets?id=eq.${row.id}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  console.log(`Cleared ${(existing || []).length} product_sets`);

  // Wipe legacy families in category sets
  const fams = await api('/product_families?category=eq.sets&select=id');
  for (const f of fams || []) {
    await api(`/product_color_variants?family_id=eq.${f.id}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  if (fams?.length) {
    await api('/product_families?category=eq.sets', {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  console.log(`Cleared ${(fams || []).length} legacy set families`);

  let ok = 0;
  for (let i = 0; i < SETS.length; i += 1) {
    const s = SETS[i];
    const slug = slugify(`${s.set_name}-${s.set_id}`);
    await api('/product_sets', {
      method: 'POST',
      body: {
        set_code: s.set_id,
        slug,
        name: s.set_name,
        description: s.description || '',
        material: s.material || '',
        design: s.design || '',
        type_label: s.type || 'Jewellery Set',
        colour: s.colour || '',
        set_sku: s.set_sku || '',
        price_override: s.price_inr == null ? null : s.price_inr,
        hero_url: '',
        gallery: [],
        shipping: {},
        badge: '',
        status: 'draft',
        active: true,
        sort_order: i,
      },
    });
    ok += 1;
    console.log(`+ ${s.set_id} ${s.set_name}`);
  }

  console.log(`\nSeeded ${ok}/${SETS.length} sets as draft. Add images + member products in admin → Sets.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

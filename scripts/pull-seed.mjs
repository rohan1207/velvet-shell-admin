import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

function loadExportModule(relPath, exportNames) {
  const full = join(root, relPath);
  const code = readFileSync(full, 'utf8')
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ');
  const sandbox = { module: { exports: {} }, exports: {}, console };
  sandbox.exports = sandbox.module.exports;
  const assign = exportNames.map((n) => `${n}`).join(', ');
  const wrapped = `${code}\n; module.exports = { ${assign} };`;
  vm.runInNewContext(wrapped, sandbox, { filename: full });
  return sandbox.module.exports;
}

const { products, collections, categories } = loadExportModule('lib/products.js', [
  'collections',
  'categories',
  'products',
]);
const { journal } = loadExportModule('lib/journal.js', ['journal']);

const seededProducts = products.map((p, i) => ({
  id: `prod-${i + 1}`,
  slug: p.slug,
  name: p.name,
  collection: p.collection,
  category: p.category,
  price: p.price,
  limited: !!p.limited,
  madeToOrder: !!p.madeToOrder,
  badge: p.badge || '',
  metal: p.metal || [],
  sizes: p.sizes || [],
  image: p.image,
  hoverImage: p.hoverImage || '',
  gallery: (p.gallery || []).slice(0, 6),
  description: p.description || '',
  story: p.story || '',
  details: p.details || [],
  care: p.care || '',
  status: i % 17 === 0 ? 'draft' : 'active',
  stock: p.madeToOrder ? 0 : i % 11 === 0 ? 2 : 8 + (i % 12),
  outOfStock: false,
  metaTitle: `${p.name} | Velvet Shell`,
  metaDescription: (p.description || '').slice(0, 155),
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
}));

const blogs = journal.map((j, i) => ({
  slug: j.slug,
  title: j.title,
  eyebrow: j.eyebrow,
  excerpt: j.excerpt,
  body: Array.isArray(j.body) ? j.body.join('\n\n') : j.body,
  image: j.image,
  status: i === journal.length - 1 ? 'draft' : 'live',
  publishedAt: j.date,
  read: j.read,
}));

const testimonials = [
  {
    id: 'ananya',
    name: 'Ananya Mehra',
    place: 'Jaipur',
    image: '/bracelets/catalog/wear-flower-rain-pink.jpg',
    image2: '',
    quote:
      'I ordered the Flower In The Rain bracelet for my sister’s birthday. The box arrived looking like a gift from a private atelier.',
    piece: 'Flower In The Rain Bracelet',
    active: true,
  },
  {
    id: 'meera',
    name: 'Meera Kapoor',
    place: 'Mumbai',
    image: '/earrings/catalog/phalaenopsis-hoop-earrings.jpg',
    image2: '',
    quote: 'I wear the phalaenopsis hoops almost every day now.',
    piece: 'Phalaenopsis Flower Hoops',
    active: true,
  },
  {
    id: 'arjun',
    name: 'Arjun Desai',
    place: 'Bengaluru',
    image: '/brooch/catalog/wear-calla-lily-brooch-gold.jpg',
    image2: '',
    quote: 'Bought the calla lily brooch for my mother.',
    piece: 'Calla Lily Brooch',
    active: true,
  },
  {
    id: 'isha',
    name: 'Isha Nair',
    place: 'Kochi',
    image: '/rings/catalog/wear-aquamarine-butterfly-ring.jpg',
    image2: '',
    quote: 'The aquamarine butterfly ring looks exactly like the photos.',
    piece: 'Aquamarine Butterfly Ring',
    active: true,
  },
  {
    id: 'priya',
    name: 'Priya Shah',
    place: 'Ahmedabad',
    image: '/bracelets/catalog/lotus-whisper-pink-v3.jpg',
    image2: '',
    quote: 'I stacked the lotus whisper with a simple chain and it felt like my own edit.',
    piece: 'Lotus Whisper Bracelet',
    active: true,
  },
];

const names = [
  ['Ananya', 'Mehra', 'ananya@email.com', '9876500001'],
  ['Meera', 'Kapoor', 'meera@email.com', '9876500002'],
  ['Arjun', 'Desai', 'arjun@email.com', '9876500003'],
  ['Isha', 'Nair', 'isha@email.com', '9876500004'],
  ['Priya', 'Shah', 'priya@email.com', '9876500005'],
  ['Rohan', 'Malik', 'rohan@email.com', '9876500006'],
  ['Kavya', 'Iyer', 'kavya@email.com', '9876500007'],
  ['Dev', 'Singh', 'dev@email.com', '9876500008'],
];

const statuses = [
  'pending',
  'accepted',
  'packed',
  'dispatched',
  'delivered',
  'pending',
  'accepted',
  'delivered',
  'pending',
  'delivered',
  'packed',
  'delivered',
];

const orders = statuses.map((status, i) => {
  const [first, last, email, phone] = names[i % names.length];
  const p1 = seededProducts[i % seededProducts.length];
  const p2 = seededProducts[(i + 3) % seededProducts.length];
  const items = [
    {
      slug: p1.slug,
      name: p1.name,
      image: p1.image,
      size: p1.sizes[0] || 'One size',
      metal: p1.metal[0] || 'S925 Silver',
      qty: 1,
      unitPrice: p1.price,
      lineTotal: p1.price,
    },
  ];
  if (i % 3 === 0) {
    items.push({
      slug: p2.slug,
      name: p2.name,
      image: p2.image,
      size: p2.sizes[0] || 'One size',
      metal: p2.metal[0] || 'S925 Silver',
      qty: 1,
      unitPrice: p2.price,
      lineTotal: p2.price,
    });
  }
  const total = items.reduce((s, it) => s + it.lineTotal, 0);
  const created = new Date(Date.now() - i * 2.5 * 86400000);
  return {
    id: `ord-${1000 + i}`,
    orderNumber: `VS${240100 + i}`,
    status,
    email,
    customer: { firstName: first, lastName: last, phone },
    items,
    total,
    shipping: {
      address: '12 Atelier Lane',
      city: 'Jaipur',
      state: 'Rajasthan',
      postal: '302001',
      country: 'India',
    },
    paymentMethod: 'Razorpay',
    paymentId: `pay_demo_${i}`,
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
  };
});

const looks = [
  {
    id: 'ear-wrist-edit',
    title: 'The Soft Bloom Edit',
    line: 'Earrings, bracelet and ring — one quiet language.',
    image: '/images/look-ear-wrist.jpg',
    alt: 'Indian model wearing phalaenopsis earrings, flower bracelet and floral ring',
    hotspots: [
      { id: 'earrings', productSlug: 'phalaenopsis-hoop-earrings', x: 24, y: 44 },
      { id: 'ring', productSlug: 'flower-adjustable-ring-silver', x: 58, y: 50 },
      { id: 'bracelet', productSlug: 'flower-in-the-rain-pink', x: 60, y: 82 },
    ],
  },
  {
    id: 'collar-lapel-edit',
    title: 'The Collar & Lapel Edit',
    line: 'Necklace, brooch and ring — worn as one thought.',
    image: '/images/look-collar-lapel.jpg',
    alt: 'Indian model wearing pink flower necklace, calla lily brooch and floral ring',
    hotspots: [
      { id: 'necklace', productSlug: 'flower-in-the-rain-necklace-pink', x: 50, y: 52 },
      { id: 'brooch', productSlug: 'calla-lily-brooch-gold', x: 70, y: 58 },
      { id: 'ring', productSlug: 'flower-adjustable-ring', x: 78, y: 70 },
    ],
  },
];

const outDir = join(__dirname, '..', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, 'seed.json'),
  JSON.stringify(
    { collections, categories, products: seededProducts, blogs, testimonials, orders, looks },
    null,
    2
  )
);
console.log(
  'seeded',
  seededProducts.length,
  'products,',
  orders.length,
  'orders,',
  blogs.length,
  'blogs,',
  looks.length,
  'looks'
);

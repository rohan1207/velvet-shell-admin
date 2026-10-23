'use client';

import seed from '@/data/seed.json';

const KEY = 'vs-admin-store-v1';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function defaultStore() {
  return clone({
    products: seed.products,
    orders: seed.orders,
    blogs: seed.blogs,
    testimonials: seed.testimonials,
    collections: seed.collections,
    categories: seed.categories,
    looks: seed.looks || [],
  });
}

export function loadStore() {
  if (typeof window === 'undefined') return defaultStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh = defaultStore();
      localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw);
    // Migrate older admin stores that predate looks.
    if (!Array.isArray(parsed.looks) || parsed.looks.length === 0) {
      parsed.looks = clone(seed.looks || []);
      localStorage.setItem(KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return defaultStore();
  }
}

function saveStore(store) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new Event('vs-admin-store'));
}

export function resetStore() {
  const fresh = defaultStore();
  saveStore(fresh);
  return fresh;
}

export function getMeta() {
  const s = loadStore();
  return { collections: s.collections, categories: s.categories };
}

export function listProducts({ q = '', category = '', collection = '', status = '', stock = '' } = {}) {
  let rows = loadStore().products;
  const query = q.trim().toLowerCase();
  if (query) {
    rows = rows.filter((p) =>
      [p.name, p.slug, p.category, p.collection].join(' ').toLowerCase().includes(query)
    );
  }
  if (category) rows = rows.filter((p) => p.category === category);
  if (collection) rows = rows.filter((p) => p.collection === collection);
  if (status) rows = rows.filter((p) => p.status === status);
  if (stock === 'out') rows = rows.filter((p) => p.outOfStock || p.stock <= 0);
  if (stock === 'low') rows = rows.filter((p) => !p.outOfStock && p.stock > 0 && p.stock <= 3);
  if (stock === 'in') rows = rows.filter((p) => !p.outOfStock && p.stock > 3);
  return rows;
}

export function getProduct(slug) {
  return loadStore().products.find((p) => p.slug === slug) || null;
}

export function saveProduct(product) {
  const store = loadStore();
  const idx = store.products.findIndex((p) => p.slug === product.slug || p.id === product.id);
  const next = {
    ...product,
    gallery: (product.gallery || []).filter(Boolean).slice(0, 6),
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) store.products[idx] = { ...store.products[idx], ...next };
  else {
    next.id = product.id || `prod-${Date.now()}`;
    next.createdAt = product.createdAt || new Date().toISOString();
    store.products.unshift(next);
  }
  saveStore(store);
  return next;
}

export function listOrders({ q = '', status = '' } = {}) {
  let rows = [...loadStore().orders].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const query = q.trim().toLowerCase();
  if (query) {
    rows = rows.filter((o) =>
      [o.orderNumber, o.email, o.customer?.firstName, o.customer?.lastName]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }
  if (status) rows = rows.filter((o) => o.status === status);
  return rows;
}

export function getOrder(id) {
  return loadStore().orders.find((o) => o.id === id || o.orderNumber === id) || null;
}

export function updateOrderStatus(id, status) {
  const store = loadStore();
  const idx = store.orders.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  store.orders[idx] = {
    ...store.orders[idx],
    status,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  return store.orders[idx];
}

export function pendingOrderCount() {
  return loadStore().orders.filter((o) => o.status === 'pending').length;
}

export function listCustomers() {
  const map = new Map();
  for (const order of loadStore().orders) {
    const key = order.email;
    const existing = map.get(key) || {
      email: order.email,
      firstName: order.customer?.firstName || '',
      lastName: order.customer?.lastName || '',
      phone: order.customer?.phone || '',
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: order.createdAt,
    };
    existing.orderCount += 1;
    existing.totalSpent += order.total || 0;
    if (new Date(order.createdAt) > new Date(existing.lastOrderAt)) {
      existing.lastOrderAt = order.createdAt;
    }
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
}

export function listBlogs() {
  return loadStore().blogs;
}

export function getBlog(slug) {
  return loadStore().blogs.find((b) => b.slug === slug) || null;
}

export function saveBlog(blog) {
  const store = loadStore();
  const idx = store.blogs.findIndex((b) => b.slug === blog.slug);
  if (idx >= 0) store.blogs[idx] = blog;
  else store.blogs.unshift(blog);
  saveStore(store);
  return blog;
}

export function listTestimonials() {
  return loadStore().testimonials;
}

export function saveTestimonial(item) {
  const store = loadStore();
  const idx = store.testimonials.findIndex((t) => t.id === item.id);
  if (idx >= 0) store.testimonials[idx] = item;
  else store.testimonials.unshift(item);
  saveStore(store);
  return item;
}

export function listLooks() {
  return loadStore().looks || [];
}

export function getLook(id) {
  return (loadStore().looks || []).find((l) => l.id === id) || null;
}

export function saveLook(look) {
  const store = loadStore();
  if (!Array.isArray(store.looks)) store.looks = [];
  const idx = store.looks.findIndex((l) => l.id === look.id);
  const next = {
    ...look,
    hotspots: (look.hotspots || []).map((h) => ({
      id: h.id,
      productSlug: h.productSlug,
      x: Number(h.x),
      y: Number(h.y),
    })),
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) store.looks[idx] = { ...store.looks[idx], ...next };
  else store.looks.push(next);
  saveStore(store);
  return next;
}

export function saveLooks(looks) {
  const store = loadStore();
  store.looks = looks;
  saveStore(store);
  return looks;
}

export function getDashboardStats() {
  const store = loadStore();
  const products = store.products;
  const orders = store.orders;
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const revenueAll = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);
  const revenueMonth = orders
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === month && d.getFullYear() === year && o.status !== 'cancelled';
    })
    .reduce((s, o) => s + (o.total || 0), 0);
  const revenueYear = orders
    .filter((o) => new Date(o.createdAt).getFullYear() === year && o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);

  const visits = [
    { day: 'Mon', views: 420 },
    { day: 'Tue', views: 510 },
    { day: 'Wed', views: 480 },
    { day: 'Thu', views: 620 },
    { day: 'Fri', views: 710 },
    { day: 'Sat', views: 890 },
    { day: 'Sun', views: 760 },
  ];

  return {
    liveProducts: products.filter((p) => p.status === 'active').length,
    draftProducts: products.filter((p) => p.status === 'draft').length,
    lowStock: products.filter((p) => !p.outOfStock && p.stock > 0 && p.stock <= 3).length,
    customers: listCustomers().length,
    orders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    revenueMonth,
    revenueYear,
    revenueAll,
    visits,
    topPages: [
      { path: '/', views: 1240 },
      { path: '/shop', views: 980 },
      { path: '/gifting', views: 640 },
      { path: '/shop?category=rings', views: 420 },
      { path: '/blogs', views: 210 },
    ],
  };
}

import { createAdminSupabase } from '@/lib/supabase';

function monthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function yearBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear() + 1, 0, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function isConfirmed(order) {
  return !['cancelled', 'refunded', 'pending_payment'].includes(order.status);
}

function revenueFromOrders(orders, { start, end } = {}) {
  return (orders || [])
    .filter((o) => {
      if (!isConfirmed(o)) return false;
      if (!start) return true;
      const t = new Date(o.created_at).getTime();
      return t >= new Date(start).getTime() && t < new Date(end).getTime();
    })
    .reduce((s, o) => s + (Number(o.total) || 0), 0);
}

/**
 * Aggregate live catalogue + commerce stats from Supabase.
 * Numbers are always real counts from the database (0 when empty).
 */
export async function getDashboardStats() {
  const db = createAdminSupabase();

  const [
    familiesRes,
    variantsRes,
    categoriesRes,
    collectionsRes,
    ordersRes,
    profilesRes,
    codesRes,
    bulkRes,
  ] = await Promise.all([
    db.from('product_families').select('id,slug,name,category,status,active,collection_slug'),
    db
      .from('product_color_variants')
      .select(
        'id,family_id,slug,color_label,price,stock,out_of_stock,active,hero_url,gallery,features',
      ),
    db.from('shop_categories').select('slug,name,active').eq('active', true),
    db.from('collections').select('slug,name'),
    db.from('orders').select('id,order_number,email,status,total,created_at,shipping'),
    db.from('profiles').select('id,email,role'),
    db.from('discount_codes').select('id,active,starts_at,ends_at'),
    db.from('bulk_discounts').select('id,active,starts_at,ends_at'),
  ]);

  const error =
    familiesRes.error ||
    variantsRes.error ||
    categoriesRes.error ||
    collectionsRes.error ||
    ordersRes.error ||
    profilesRes.error ||
    codesRes.error ||
    bulkRes.error;

  if (error && !familiesRes.data) {
    throw new Error(error.message || 'Could not load dashboard');
  }

  const families = familiesRes.data || [];
  const variants = variantsRes.data || [];
  const orders = ordersRes.data || [];
  const profiles = (profilesRes.data || []).filter((p) => p.role !== 'admin');

  const liveFamilies = families.filter((f) => f.status === 'active' && f.active !== false);
  const draftFamilies = families.filter((f) => f.status === 'draft' || f.active === false);
  const activeVariants = variants.filter((v) => v.active !== false);

  const lowStockVariants = activeVariants
    .filter((v) => !v.out_of_stock && Number(v.stock) > 0 && Number(v.stock) <= 3)
    .sort((a, b) => a.stock - b.stock);

  const outOfStock = activeVariants.filter(
    (v) => v.out_of_stock || Number(v.stock) <= 0,
  ).length;

  const missingImages = activeVariants.filter(
    (v) => !v.hero_url && !(Array.isArray(v.gallery) && v.gallery.length),
  ).length;

  const unitsInStock = activeVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const inventoryValue = activeVariants.reduce(
    (s, v) => s + (Number(v.price) || 0) * (Number(v.stock) || 0),
    0,
  );

  const familyById = Object.fromEntries(families.map((f) => [f.id, f]));

  const byCategory = {};
  for (const f of liveFamilies) {
    const key = f.category || 'uncategorised';
    byCategory[key] = (byCategory[key] || 0) + 1;
  }
  const categoryBreakdown = Object.entries(byCategory)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const lowStock = lowStockVariants.slice(0, 8).map((v) => {
    const fam = familyById[v.family_id];
    const sku =
      (Array.isArray(v.features)
        ? String(v.features.find((x) => /^SKU\s/i.test(String(x))) || '').replace(/^SKU\s+/i, '')
        : '') || v.slug;
    return {
      id: v.id,
      sku,
      slug: v.slug,
      familySlug: fam?.slug || '',
      name: fam?.name || v.slug,
      color: v.color_label || '',
      stock: Number(v.stock) || 0,
      price: Number(v.price) || 0,
    };
  });

  const now = new Date();
  const isActiveDiscount = (row) => {
    if (!row?.active) return false;
    if (row.starts_at && new Date(row.starts_at) > now) return false;
    if (row.ends_at && new Date(row.ends_at) < now) return false;
    return true;
  };

  const codes = codesRes.data || [];
  const bulks = bulkRes.data || [];
  const activeDiscounts =
    codes.filter(isActiveDiscount).length + bulks.filter(isActiveDiscount).length;

  const month = monthBounds(now);
  const year = yearBounds(now);

  const orderStatus = {
    pending_payment: 0,
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };
  for (const o of orders) {
    if (orderStatus[o.status] != null) orderStatus[o.status] += 1;
  }

  const openOrders =
    orderStatus.pending_payment + orderStatus.paid + orderStatus.processing;
  const confirmedOrders = orders.filter(isConfirmed);
  const revenueAll = revenueFromOrders(orders);
  const averageOrderValue =
    confirmedOrders.length > 0
      ? Math.round(revenueAll / confirmedOrders.length)
      : 0;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      email: o.email,
      customer:
        o.shipping?.fullName ||
        [o.shipping?.firstName, o.shipping?.lastName].filter(Boolean).join(' ') ||
        '',
      status: o.status,
      total: Number(o.total) || 0,
      createdAt: o.created_at,
    }));

  return {
    source: 'supabase',
    generatedAt: now.toISOString(),
    catalog: {
      families: families.length,
      liveProducts: liveFamilies.length,
      draftProducts: draftFamilies.length,
      variants: activeVariants.length,
      lowStock: lowStockVariants.length,
      outOfStock,
      missingImages,
      unitsInStock,
      inventoryValue,
      categories: (categoriesRes.data || []).length,
      collections: (collectionsRes.data || []).length,
      activeDiscounts,
      discountCodes: codes.length,
      bulkOffers: bulks.length,
    },
    commerce: {
      customers: profiles.length,
      orders: orders.length,
      pendingOrders: openOrders,
      confirmedOrders: confirmedOrders.length,
      deliveredOrders: orderStatus.delivered,
      cancelledOrders: orderStatus.cancelled + orderStatus.refunded,
      averageOrderValue,
      revenueMonth: revenueFromOrders(orders, month),
      revenueYear: revenueFromOrders(orders, year),
      revenueAll,
      orderStatus,
    },
    categoryBreakdown,
    lowStock,
    recentOrders,
    warnings: [
      familiesRes.error?.message,
      variantsRes.error?.message,
      ordersRes.error?.message,
      profilesRes.error?.message,
      codesRes.error?.message,
      bulkRes.error?.message,
    ].filter(Boolean),
  };
}

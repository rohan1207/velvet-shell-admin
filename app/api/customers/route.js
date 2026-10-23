import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { createAdminSupabase } from '@/lib/supabase';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

export async function GET(request) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();

  try {
    const db = createAdminSupabase();
    const [profilesRes, ordersRes] = await Promise.all([
      db
        .from('profiles')
        .select('id,email,first_name,last_name,full_name,phone,role,created_at')
        .neq('role', 'admin')
        .order('created_at', { ascending: false }),
      db.from('orders').select('id,email,total,created_at,user_id,status'),
    ]);

    if (profilesRes.error) throw profilesRes.error;

    const orders = ordersRes.data || [];
    const byEmail = new Map();

    for (const o of orders) {
      if (['cancelled', 'refunded', 'pending_payment'].includes(o.status)) continue;
      const key = (o.email || '').toLowerCase();
      if (!key) continue;
      const prev = byEmail.get(key) || { orderCount: 0, totalSpent: 0, lastOrderAt: null };
      prev.orderCount += 1;
      prev.totalSpent += Number(o.total) || 0;
      if (!prev.lastOrderAt || new Date(o.created_at) > new Date(prev.lastOrderAt)) {
        prev.lastOrderAt = o.created_at;
      }
      byEmail.set(key, prev);
    }

    const customers = (profilesRes.data || []).map((p) => {
      const email = (p.email || '').toLowerCase();
      const stats = byEmail.get(email) || {
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
      };
      return {
        id: p.id,
        email: p.email,
        firstName: p.first_name || p.full_name?.split(' ')[0] || '',
        lastName: p.last_name || p.full_name?.split(' ').slice(1).join(' ') || '',
        phone: p.phone || '',
        createdAt: p.created_at,
        ...stats,
      };
    });

    // Include guests who ordered without a profile match
    for (const [email, stats] of byEmail) {
      if (!customers.some((c) => (c.email || '').toLowerCase() === email)) {
        customers.push({
          id: null,
          email,
          firstName: '',
          lastName: '',
          phone: '',
          createdAt: stats.lastOrderAt,
          ...stats,
        });
      }
    }

    customers.sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({ customers });
  } catch (err) {
    console.error('[admin customers GET]', err);
    return NextResponse.json(
      { error: err.message || 'Could not load customers', customers: [] },
      { status: 500 },
    );
  }
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import DiscountForm from '@/components/DiscountForm';
import { getMeta } from '@/lib/repository';
import { moneyINR, statusTone } from '@/lib/discounts-client';

export default function EditDiscountPage() {
  const { kind, id } = useParams();
  const router = useRouter();
  const [meta, setMeta] = useState({ categories: [], collections: [] });
  const [products, setProducts] = useState([]);
  const [discount, setDiscount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMeta(getMeta());
    Promise.all([
      fetch(`/api/catalog/discounts/${kind}/${id}`).then((r) => r.json()),
      fetch('/api/catalog/categories').then((r) => r.json()).catch(() => ({})),
      fetch('/api/catalog/products').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([one, cats, prods]) => {
        if (one.discount) setDiscount(one.discount);
        else setError(one.error || 'Not found');
        if (cats.categories?.length) {
          setMeta((m) => ({
            ...m,
            categories: cats.categories.map((c) => ({ slug: c.slug, name: c.name })),
          }));
        }
        setProducts(
          (prods.products || []).map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            category: p.category,
          }))
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [kind, id]);

  if (loading) return <p className="text-sm text-[#7a736c]">Loading…</p>;
  if (!discount) {
    return (
      <div className="space-y-3">
        <Link href="/discounts" className="font-label text-[10px] text-[#7a736c]">
          ← Discounts
        </Link>
        <p className="text-[#5e062a]">{error || 'Not found'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/discounts" className="font-label text-[10px] text-[#7a736c] hover:text-[#5e062a]">
            ← Discounts
          </Link>
          <h1 className="font-display mt-2 text-4xl">
            {discount.kind === 'code' ? discount.code : discount.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusTone(discount.status)}`}
            >
              {discount.status}
            </span>
            <span className="rounded-full bg-[#faf7f2] px-2.5 py-1 text-[10px] uppercase tracking-wider">
              Used {discount.timesUsed}×
            </span>
            <span className="rounded-full bg-[#faf7f2] px-2.5 py-1 text-[10px] uppercase tracking-wider">
              Revenue {moneyINR(discount.revenue)}
            </span>
            <span className="rounded-full bg-[#faf7f2] px-2.5 py-1 text-[10px] uppercase tracking-wider">
              Saved {moneyINR(discount.discountGiven)}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="text-xs text-[#5e062a]"
          onClick={async () => {
            if (!confirm('Delete this discount?')) return;
            const res = await fetch(`/api/catalog/discounts/${kind}/${id}`, { method: 'DELETE' });
            if (res.ok) router.replace('/discounts');
          }}
        >
          Delete
        </button>
      </div>

      {error && <p className="text-sm text-[#5e062a]">{error}</p>}

      <DiscountForm
        mode={discount.kind === 'bulk' ? 'bulk' : 'code'}
        initial={discount}
        categories={meta.categories}
        collections={meta.collections}
        products={products}
        saving={saving}
        onSave={async (payload) => {
          setSaving(true);
          setError('');
          try {
            const res = await fetch(`/api/catalog/discounts/${kind}/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            setDiscount(data.discount);
            setSaving(false);
          } catch (err) {
            setError(err.message);
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

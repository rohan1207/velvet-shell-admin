'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_SHIPPING, normalizeShipping } from '@/lib/shipping';
import { money, slugify } from '@/lib/format';

function emptyForm() {
  return {
    setCode: '',
    name: '',
    slug: '',
    description: '',
    material: '925 Sterling Silver',
    design: '',
    typeLabel: 'Jewellery Set',
    colour: 'Silver',
    setSku: '',
    priceOverride: '',
    heroUrl: '',
    gallery: [],
    badge: '',
    status: 'draft',
    active: true,
    sortOrder: 0,
    shipping: normalizeShipping(DEFAULT_SHIPPING),
    items: [],
  };
}

function fromInitial(initial) {
  if (!initial) return emptyForm();
  return {
    setCode: initial.setCode || '',
    name: initial.name || '',
    slug: initial.slug || '',
    description: initial.description || '',
    material: initial.material || '925 Sterling Silver',
    design: initial.design || '',
    typeLabel: initial.typeLabel || 'Jewellery Set',
    colour: initial.colour || 'Silver',
    setSku: initial.setSku || '',
    priceOverride:
      initial.priceOverride == null || initial.priceOverride === ''
        ? ''
        : String(initial.priceOverride),
    heroUrl: initial.heroUrl || '',
    gallery: Array.isArray(initial.gallery) ? initial.gallery : [],
    badge: initial.badge || '',
    status: initial.status || 'draft',
    active: initial.active !== false,
    sortOrder: initial.sortOrder || 0,
    shipping: normalizeShipping(initial.shipping || DEFAULT_SHIPPING),
    items: (initial.items || []).map((it) => ({
      familyId: it.familyId,
      variantId: it.variantId,
      familyName: it.familyName,
      familyCategory: it.familyCategory,
      variantSlug: it.variantSlug,
      colorLabel: it.colorLabel,
      price: it.price,
      outOfStock: it.outOfStock,
      heroUrl: it.heroUrl,
    })),
  };
}

export default function SetForm({ initial = null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => fromInitial(initial));
  const formRef = useRef(form);
  formRef.current = form;

  const [picker, setPicker] = useState([]);
  const [pickerQ, setPickerQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sets?picker=1', { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setPicker(data.products || []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const membersSum = useMemo(
    () => form.items.reduce((s, it) => s + (Number(it.price) || 0), 0),
    [form.items],
  );
  const overrideNum =
    form.priceOverride === '' ? null : Math.max(0, Math.round(Number(form.priceOverride) || 0));
  const setPrice = overrideNum != null ? overrideNum : membersSum;
  const anyOos = form.items.some((it) => it.outOfStock);

  function patch(partial) {
    setForm((f) => ({ ...f, ...partial }));
  }

  function addProduct(p) {
    setForm((f) => {
      if (f.items.some((it) => it.familyId === p.familyId)) return f;
      return {
        ...f,
        items: [
          ...f.items,
          {
            familyId: p.familyId,
            variantId: p.variantId,
            familyName: p.name,
            familyCategory: p.category,
            variantSlug: p.variantSlug,
            colorLabel: p.colorLabel,
            price: p.price,
            outOfStock: p.outOfStock,
            heroUrl: p.heroUrl,
          },
        ],
      };
    });
  }

  function removeItem(familyId) {
    setForm((f) => ({ ...f, items: f.items.filter((it) => it.familyId !== familyId) }));
  }

  function selectVariant(familyId, variant) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it) =>
        it.familyId === familyId
          ? {
              ...it,
              variantId: variant.id,
              variantSlug: variant.slug,
              colorLabel: variant.colorLabel,
              price: variant.price,
              outOfStock: variant.outOfStock,
              heroUrl: variant.heroUrl,
            }
          : it,
      ),
    }));
  }

  async function uploadFiles(files) {
    setUploading(true);
    setError('');
    try {
      const uploaded = [];
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push({ url: data.url, kind: 'image' });
      }
      setForm((f) => {
        const gallery = [...(f.gallery || []), ...uploaded];
        const heroUrl = f.heroUrl || gallery[0]?.url || '';
        return { ...f, gallery, heroUrl };
      });
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function onSave(e) {
    e?.preventDefault?.();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const f = formRef.current;
      const payload = {
        id: initial?.id,
        setCode: f.setCode,
        name: f.name,
        slug: f.slug || slugify(f.name),
        description: f.description,
        material: f.material,
        design: f.design,
        typeLabel: f.typeLabel,
        colour: f.colour,
        setSku: f.setSku,
        priceOverride: f.priceOverride === '' ? null : Number(f.priceOverride),
        heroUrl: f.heroUrl,
        gallery: f.gallery,
        badge: f.badge,
        status: f.status,
        active: f.active,
        sortOrder: f.sortOrder,
        shipping: normalizeShipping(f.shipping),
        items: f.items.map((it) => ({
          familyId: it.familyId,
          variantId: it.variantId,
        })),
      };
      const url = initial?.id ? `/api/sets/${initial.id}` : '/api/sets';
      const res = await fetch(url, {
        method: initial?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setNotice('Saved');
      if (!initial?.id && data.set?.id) {
        router.replace(`/sets/${data.set.id}`);
      }
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const filteredPicker = useMemo(() => {
    const q = pickerQ.trim().toLowerCase();
    const selected = new Set(form.items.map((it) => it.familyId));
    return picker.filter((p) => {
      if (selected.has(p.familyId)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.variantSlug?.toLowerCase().includes(q)
      );
    });
  }, [picker, pickerQ, form.items]);

  return (
    <form onSubmit={onSave} className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">
            {initial ? 'Edit set' : 'New set'}
          </h1>
          <p className="mt-1 text-sm text-[#7a736c]">
            Own hero images + pick existing products. Set price defaults to the sum of members.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={saving || uploading}>
            {saving ? 'Saving…' : 'Save set'}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-[#5e062a]">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <section className="card space-y-4 p-5">
        <p className="font-label text-[10px] tracking-[0.16em] text-[#7a736c] uppercase">Basics</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-xs text-[#7a736c]">Name</span>
            <input
              className="input mt-1"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                patch({
                  name,
                  slug: form.slug && initial ? form.slug : slugify(name),
                });
              }}
              required
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Slug</span>
            <input
              className="input mt-1"
              value={form.slug}
              onChange={(e) => patch({ slug: slugify(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Set code</span>
            <input
              className="input mt-1"
              value={form.setCode}
              onChange={(e) => patch({ setCode: e.target.value })}
              placeholder="S01"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-[#7a736c]">Description</span>
            <textarea
              className="input mt-1 min-h-[110px]"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Material</span>
            <input
              className="input mt-1"
              value={form.material}
              onChange={(e) => patch({ material: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Design</span>
            <input
              className="input mt-1"
              value={form.design}
              onChange={(e) => patch({ design: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Type</span>
            <input
              className="input mt-1"
              value={form.typeLabel}
              onChange={(e) => patch({ typeLabel: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Colour</span>
            <input
              className="input mt-1"
              value={form.colour}
              onChange={(e) => patch({ colour: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Set SKU (optional)</span>
            <input
              className="input mt-1"
              value={form.setSku}
              onChange={(e) => patch({ setSku: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Badge</span>
            <input
              className="input mt-1"
              value={form.badge}
              onChange={(e) => patch({ badge: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Status</span>
            <select
              className="input mt-1"
              value={form.status}
              onChange={(e) => patch({ status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </label>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <p className="font-label text-[10px] tracking-[0.16em] text-[#7a736c] uppercase">
          Set images (hero / gallery)
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(e) => {
            const files = [...(e.target.files || [])];
            e.target.value = '';
            if (files.length) uploadFiles(files);
          }}
        />
        {uploading ? <p className="text-xs text-[#7a736c]">Uploading…</p> : null}
        <div className="flex flex-wrap gap-3">
          {(form.gallery || []).map((g) => (
            <div key={g.url} className="relative h-24 w-20 overflow-hidden rounded-xl bg-[#faf7f2]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 rounded bg-white/90 px-1 text-[10px]"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    gallery: f.gallery.filter((x) => x.url !== g.url),
                    heroUrl: f.heroUrl === g.url ? '' : f.heroUrl,
                  }))
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-label text-[10px] tracking-[0.16em] text-[#7a736c] uppercase">
              Products in this set
            </p>
            <p className="mt-1 text-sm text-[#7a736c]">
              Select existing pieces. Stock of the set follows the members.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2d2b2b]/8 bg-[#faf7f2] px-4 py-3 text-right">
            <p className="text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">Set cost</p>
            <p className="font-num text-2xl text-[#5e062a]">{money(setPrice)}</p>
            <p className="mt-0.5 text-[11px] text-[#7a736c]">
              Members sum {money(membersSum)}
              {overrideNum != null ? ' · override on' : ''}
              {anyOos ? ' · some members OOS' : ''}
            </p>
          </div>
        </div>

        <label className="block max-w-xs">
          <span className="text-xs text-[#7a736c]">Price override (optional, INR)</span>
          <input
            className="input mt-1"
            type="number"
            min="0"
            placeholder={`Leave blank → ${membersSum}`}
            value={form.priceOverride}
            onChange={(e) => patch({ priceOverride: e.target.value })}
          />
        </label>

        <ul className="space-y-3">
          {form.items.map((it) => {
            const family = picker.find((p) => p.familyId === it.familyId);
            return (
              <li
                key={it.familyId}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#2d2b2b]/8 px-3 py-3"
              >
                <div className="h-14 w-12 overflow-hidden rounded-lg bg-[#faf7f2]">
                  {it.heroUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.heroUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#2d2b2b]">{it.familyName}</p>
                  <p className="text-[11px] text-[#7a736c]">
                    {it.familyCategory} · {money(it.price)}
                    {it.outOfStock ? ' · Out of stock' : ''}
                  </p>
                  {family?.variants?.length > 1 ? (
                    <select
                      className="input mt-2 max-w-xs py-1.5 text-sm"
                      value={it.variantId || ''}
                      onChange={(e) => {
                        const v = family.variants.find((x) => x.id === e.target.value);
                        if (v) selectVariant(it.familyId, v);
                      }}
                    >
                      {family.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.colorLabel || v.slug} · {money(v.price)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-[11px] tracking-[0.12em] text-[#5e062a] uppercase"
                  onClick={() => removeItem(it.familyId)}
                >
                  Remove
                </button>
              </li>
            );
          })}
          {!form.items.length ? (
            <p className="text-sm text-[#7a736c]">No products selected yet.</p>
          ) : null}
        </ul>

        <div className="border-t border-[#2d2b2b]/8 pt-4">
          <input
            className="input mb-3"
            placeholder="Search products to add…"
            value={pickerQ}
            onChange={(e) => setPickerQ(e.target.value)}
          />
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {filteredPicker.slice(0, 40).map((p) => (
              <li key={p.familyId}>
                <button
                  type="button"
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#faf7f2]"
                >
                  <div className="h-10 w-8 overflow-hidden rounded bg-[#eee]">
                    {p.heroUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.heroUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {p.name}
                    <span className="text-[#7a736c]"> · {p.category} · {money(p.price)}</span>
                  </span>
                  <span className="font-label text-[10px] tracking-[0.14em] text-[#5e062a] uppercase">
                    Add
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <p className="font-label text-[10px] tracking-[0.16em] text-[#7a736c] uppercase">
          Shipping defaults
        </p>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Intro</span>
          <textarea
            className="input mt-1 min-h-[72px]"
            value={form.shipping.intro}
            onChange={(e) =>
              patch({ shipping: { ...form.shipping, intro: e.target.value } })
            }
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Note</span>
          <textarea
            className="input mt-1 min-h-[72px]"
            value={form.shipping.note}
            onChange={(e) =>
              patch({ shipping: { ...form.shipping, note: e.target.value } })
            }
          />
        </label>
      </section>

      <button type="submit" className="btn-primary" disabled={saving || uploading}>
        {saving ? 'Saving…' : 'Save set'}
      </button>
    </form>
  );
}

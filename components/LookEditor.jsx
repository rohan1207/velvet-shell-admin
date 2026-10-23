'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { listProducts } from '@/lib/repository';
import { money } from '@/lib/format';
import ImageUploadField from '@/components/ImageUploadField';

function ProductPicker({ onPick, onClose }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => listProducts({ q, status: 'active' }).slice(0, 40), [q]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2d2b2b]/45 p-4">
      <div className="card flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#2d2b2b]/8 px-5 py-4">
          <div>
            <p className="font-label text-[10px] text-[#d4af64]">Attach product</p>
            <h3 className="font-display mt-1 text-2xl">Choose a piece</h3>
          </div>
          <button type="button" className="text-sm text-[#7a736c]" onClick={onClose}>
            Cancel
          </button>
        </div>
        <div className="border-b border-[#2d2b2b]/8 px-5 py-3">
          <input
            autoFocus
            className="input"
            placeholder="Search name or slug"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {rows.map((p) => (
            <li key={p.slug}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#faf7f2]"
              >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#ebe3da]">
                  {p.image ? (
                    <Image src={p.image} alt="" fill className="object-cover" sizes="48px" unoptimized />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-[#7a736c]">
                    <span className="font-num">{p.slug} · {money(p.price)}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-[#7a736c]">No products match.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default function LookEditor({ look, onSave }) {
  const [form, setForm] = useState(() => ({
    ...look,
    hotspots: look.hotspots ? [...look.hotspots] : [],
  }));
  const [marking, setMarking] = useState(false);
  const [pickerFor, setPickerFor] = useState(null); // { x, y } or hotspot id string
  const [saved, setSaved] = useState(false);
  const imgWrapRef = useRef(null);

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function onImageClick(e) {
    if (!marking || !form.image) return;
    const wrap = imgWrapRef.current;
    if (!wrap) return;
    const img = wrap.querySelector('img');
    if (!img) return;

    const rect = img.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      return;
    }
    const x = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const y = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));
    setPickerFor({ x, y, mode: 'new' });
  }

  function attachProduct(product) {
    if (!pickerFor) return;
    if (pickerFor.mode === 'new') {
      const id = `spot-${Date.now()}`;
      update({
        hotspots: [
          ...form.hotspots,
          { id, productSlug: product.slug, x: pickerFor.x, y: pickerFor.y },
        ],
      });
    } else {
      update({
        hotspots: form.hotspots.map((h) =>
          h.id === pickerFor.id ? { ...h, productSlug: product.slug } : h
        ),
      });
    }
    setPickerFor(null);
    setMarking(false);
  }

  function removeSpot(id) {
    update({ hotspots: form.hotspots.filter((h) => h.id !== id) });
  }

  const productsBySlug = useMemo(() => {
    const map = new Map();
    for (const p of listProducts()) map.set(p.slug, p);
    return map;
  }, []);

  return (
    <div className="card space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-label text-[10px] text-[#d4af64]">Look slot</p>
          <h2 className="font-display mt-1 text-2xl md:text-3xl">{form.title || 'Untitled look'}</h2>
        </div>
        {saved && <p className="text-sm text-emerald-700">Saved</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs text-[#7a736c]">Title</span>
          <input
            className="input mt-1"
            value={form.title || ''}
            onChange={(e) => update({ title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Supporting line</span>
          <input
            className="input mt-1"
            value={form.line || ''}
            onChange={(e) => update({ line: e.target.value })}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-[#7a736c]">Alt text</span>
        <input
          className="input mt-1"
          value={form.alt || ''}
          onChange={(e) => update({ alt: e.target.value })}
        />
      </label>

      <ImageUploadField
        label="Look image"
        folder="looks"
        value={form.image || ''}
        onChange={(url) => update({ image: url, hotspots: [] })}
        previewClassName="max-h-48 w-full rounded-xl object-contain"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={marking ? 'btn-primary' : 'btn-ghost'}
          disabled={!form.image}
          onClick={() => setMarking((v) => !v)}
        >
          {marking ? 'Marking… click image' : 'Mark hotspots'}
        </button>
      </div>

      <div
        className={`flex justify-center overflow-auto rounded-2xl border border-[#2d2b2b]/10 bg-[#ebe3da] p-3 ${
          marking ? 'ring-2 ring-[#5e062a]/35' : ''
        }`}
      >
        {form.image ? (
          <div
            ref={imgWrapRef}
            onClick={onImageClick}
            className={`relative inline-block max-w-full ${marking ? 'cursor-crosshair' : ''}`}
          >
            {/* Full image, no crop — wrapper hugs the image so % markers stay accurate. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.image}
              alt={form.alt || form.title || 'Look'}
              className="block h-auto max-h-[70vh] max-w-full select-none"
              draggable={false}
            />
            {form.hotspots.map((spot) => {
              const product = productsBySlug.get(spot.productSlug);
              return (
                <div
                  key={spot.id}
                  className="absolute z-10"
                  style={{
                    left: `${spot.x}%`,
                    top: `${spot.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <button
                    type="button"
                    title={product?.name || spot.productSlug}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPickerFor({ id: spot.id, mode: 'edit' });
                    }}
                    className="relative flex h-5 w-5 items-center justify-center"
                  >
                    <span className="absolute h-10 w-10 animate-ping rounded-full bg-white/35" />
                    <span className="absolute h-7 w-7 rounded-full border border-white/70" />
                    <span className="relative h-3.5 w-3.5 rounded-full bg-white shadow" />
                    <span className="absolute h-1.5 w-1.5 rounded-full bg-[#5e062a]" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-64 w-full items-center justify-center text-sm text-[#7a736c]">
            Upload a look image to place markers
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="font-label text-[10px] text-[#7a736c]">Hotspots ({form.hotspots.length})</p>
        {form.hotspots.length === 0 && (
          <p className="text-sm text-[#7a736c]">Turn on Mark, then click the image to place a radiating dot.</p>
        )}
        <ul className="divide-y divide-[#2d2b2b]/8 rounded-2xl border border-[#2d2b2b]/8 bg-white">
          {form.hotspots.map((spot) => {
            const product = productsBySlug.get(spot.productSlug);
            return (
              <li key={spot.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#ebe3da]">
                  {product?.image ? (
                    <Image src={product.image} alt="" fill className="object-cover" sizes="40px" unoptimized />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {product?.name || spot.productSlug || 'Unassigned'}
                  </span>
                  <span className="text-xs text-[#7a736c]">
                    {spot.x}% · {spot.y}%
                  </span>
                </span>
                <button
                  type="button"
                  className="text-xs uppercase tracking-wider text-[#5e062a]"
                  onClick={() => setPickerFor({ id: spot.id, mode: 'edit' })}
                >
                  Change
                </button>
                <button
                  type="button"
                  className="text-xs uppercase tracking-wider text-[#7a736c]"
                  onClick={() => removeSpot(spot.id)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSave(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 1600);
          }}
        >
          Save look
        </button>
      </div>

      {pickerFor && (
        <ProductPicker onPick={attachProduct} onClose={() => setPickerFor(null)} />
      )}
    </div>
  );
}

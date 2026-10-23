'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { listTestimonials, saveTestimonial } from '@/lib/repository';

const blank = {
  id: '',
  name: '',
  place: '',
  quote: '',
  piece: '',
  image: '',
  image2: '',
  active: true,
};

export default function TestimonialsPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  function reload() {
    setRows(listTestimonials());
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-[10px] text-[#d4af64]">Social proof</p>
          <h1 className="font-display mt-2 text-4xl">Testimonials</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setForm({ ...blank, id: `t-${Date.now()}` })}>
          Add testimonial
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setForm(t)}
            className="card p-4 text-left transition hover:border-[#5e062a]/25"
          >
            <div className="flex gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#ebe3da]">
                {t.image ? (
                  <Image src={t.image} alt="" fill className="object-cover" sizes="56px" unoptimized />
                ) : null}
              </span>
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-[#7a736c]">{t.place}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-[#d4af64]">
                  {t.active ? 'Active' : 'Hidden'}
                </p>
              </div>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-[#7a736c]">“{t.quote}”</p>
          </button>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d2b2b]/40 p-4">
          <form
            className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
            onSubmit={(e) => {
              e.preventDefault();
              saveTestimonial(form);
              setSaved(true);
              reload();
              setTimeout(() => {
                setSaved(false);
                setForm(null);
              }, 600);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Edit testimonial</h2>
              <button type="button" className="text-sm text-[#7a736c]" onClick={() => setForm(null)}>
                Close
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <input
                className="input"
                placeholder="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Place"
                value={form.place}
                onChange={(e) => setForm({ ...form, place: e.target.value })}
              />
              <input
                className="input"
                placeholder="Piece worn"
                value={form.piece}
                onChange={(e) => setForm({ ...form, piece: e.target.value })}
              />
              <textarea
                className="input min-h-28 rounded-2xl"
                placeholder="Quote"
                required
                value={form.quote}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
              />
              <input
                className="input"
                placeholder="Image 1 URL"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
              <input
                className="input"
                placeholder="Image 2 URL (optional)"
                value={form.image2 || ''}
                onChange={(e) => setForm({ ...form, image2: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active on storefront
              </label>
            </div>
            <button type="submit" className="btn-primary mt-5 w-full">
              {saved ? 'Saved' : 'Save'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

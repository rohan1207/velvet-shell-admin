'use client';

import { useMemo, useState } from 'react';
import DiscountScopePicker from '@/components/DiscountScopePicker';
import { randomCode } from '@/lib/discounts-client';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DiscountForm({
  mode = 'code', // code | bulk
  initial = null,
  categories = [],
  collections = [],
  products = [],
  saving = false,
  onSave,
}) {
  const isBulk = mode === 'bulk';
  const [form, setForm] = useState(() => {
    if (initial) {
      return {
        ...initial,
        code: initial.code || '',
        discountType: initial.discountType || 'percent',
        value: initial.value ?? 10,
        minOrderAmount: initial.minOrderAmount ?? 0,
        maxUses: initial.maxUses ?? '',
        maxUsesPerCustomer: initial.maxUsesPerCustomer ?? '',
        tiers: initial.tiers?.length
          ? initial.tiers
          : [
              { qty: 2, discountType: 'percent', value: 10 },
              { qty: 3, discountType: 'percent', value: 15 },
            ],
      };
    }
    return {
      name: '',
      code: randomCode('VS'),
      description: '',
      discountType: 'percent',
      value: 10,
      scope: 'all',
      scopeValues: [],
      minOrderAmount: 0,
      maxUses: '',
      maxUsesPerCustomer: 1,
      startsAt: new Date().toISOString(),
      endsAt: '',
      status: 'active',
      tiers: [
        { qty: 2, discountType: 'percent', value: 10 },
        { qty: 3, discountType: 'percent', value: 15 },
      ],
    };
  });

  const preview = useMemo(() => {
    if (isBulk) {
      return (form.tiers || [])
        .map((t) => `Buy ${t.qty} → ${t.discountType === 'fixed' ? `₹${t.value} off` : `${t.value}% off`}`)
        .join(' · ');
    }
    return form.discountType === 'fixed' ? `₹${form.value} off` : `${form.value}% off`;
  }, [form, isBulk]);

  function patch(p) {
    setForm((f) => ({ ...f, ...p }));
  }

  function submit(e) {
    e.preventDefault();
    onSave({
      ...form,
      kind: isBulk ? 'bulk' : 'code',
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      maxUses: form.maxUses === '' ? null : form.maxUses,
      maxUsesPerCustomer: form.maxUsesPerCustomer === '' ? null : form.maxUsesPerCustomer,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* Preview strip */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#5e062a]/15 bg-[#5e062a] px-6 py-7 text-[#f5eee8]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgba(212,175,100,0.35), transparent 40%), radial-gradient(circle at 85% 70%, rgba(245,238,232,0.12), transparent 35%)',
          }}
        />
        <div className="relative">
          <p className="font-label text-[10px] tracking-[0.22em] text-[#d4af64]">
            {isBulk ? 'Bulk offer preview' : 'Promo code preview'}
          </p>
          <p className="font-display mt-3 text-3xl md:text-4xl">
            {isBulk ? form.name || 'Untitled bulk offer' : form.code || 'YOURCODE'}
          </p>
          <p className="mt-2 text-sm font-light text-white/80">{preview || '—'}</p>
        </div>
      </div>

      <section className="card space-y-4 p-6">
        <p className="font-label text-[10px] text-[#7a736c]">Basics</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-xs text-[#7a736c]">Internal name</span>
            <input
              className="input mt-1"
              required
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder={isBulk ? 'Spring bulk bracelets' : 'Launch week 15%'}
            />
          </label>

          {!isBulk && (
            <label className="block md:col-span-2">
              <span className="text-xs text-[#7a736c]">Code customers type at checkout</span>
              <div className="mt-1 flex gap-2">
                <input
                  className="input font-mono tracking-[0.12em]"
                  required
                  value={form.code}
                  onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                />
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  onClick={() => patch({ code: randomCode('VS') })}
                >
                  Generate
                </button>
              </div>
            </label>
          )}

          <label className="block md:col-span-2">
            <span className="text-xs text-[#7a736c]">Description (optional)</span>
            <textarea
              className="input mt-1 min-h-20 rounded-2xl"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </label>
        </div>
      </section>

      {!isBulk ? (
        <section className="card space-y-4 p-6">
          <div>
            <p className="font-label text-[10px] text-[#7a736c]">Discount type</p>
            <p className="mt-1 text-sm font-light text-[#7a736c]">
              Choose percentage off the order, or a flat rupee amount.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                id: 'percent',
                title: 'Percentage',
                example: 'e.g. 15% off',
                icon: '%',
              },
              {
                id: 'fixed',
                title: 'Flat amount',
                example: 'e.g. ₹500 off',
                icon: '₹',
              },
            ].map((t) => {
              const on = form.discountType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patch({ discountType: t.id })}
                  className={`rounded-2xl border px-5 py-5 text-left transition ${
                    on
                      ? 'border-[#5e062a] bg-[#5e062a] text-white shadow-md'
                      : 'border-[#2d2b2b]/10 bg-[#faf7f2] text-[#2d2b2b] hover:border-[#5e062a]/35'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold ${
                      on ? 'bg-white/15 text-[#d4af64]' : 'bg-white text-[#5e062a]'
                    }`}
                  >
                    {t.icon}
                  </span>
                  <p className="mt-3 font-medium">{t.title}</p>
                  <p className={`mt-1 text-xs ${on ? 'text-white/75' : 'text-[#7a736c]'}`}>
                    {t.example}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs text-[#7a736c]">
                {form.discountType === 'fixed' ? 'Flat amount (₹ INR)' : 'Percentage (%)'}
              </span>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#7a736c]">
                  {form.discountType === 'fixed' ? '₹' : '%'}
                </span>
                <input
                  className="input pl-9"
                  type="number"
                  min="1"
                  max={form.discountType === 'percent' ? 100 : undefined}
                  required
                  value={form.value}
                  onChange={(e) => patch({ value: e.target.value })}
                  placeholder={form.discountType === 'fixed' ? '500' : '15'}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs text-[#7a736c]">Minimum order (INR)</span>
              <input
                className="input mt-1"
                type="number"
                min="0"
                value={form.minOrderAmount}
                onChange={(e) => patch({ minOrderAmount: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-xs text-[#7a736c]">Max total uses (blank = ∞)</span>
              <input
                className="input mt-1"
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => patch({ maxUses: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-xs text-[#7a736c]">Max uses per customer</span>
              <input
                className="input mt-1"
                type="number"
                min="1"
                value={form.maxUsesPerCustomer}
                onChange={(e) => patch({ maxUsesPerCustomer: e.target.value })}
              />
            </label>
          </div>
        </section>
      ) : (
        <section className="card space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-label text-[10px] text-[#7a736c]">Bulk buy tiers</p>
              <p className="mt-1 text-sm font-light text-[#7a736c]">
                Each tier can be % off or a flat ₹ amount. Highest matching qty wins.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                patch({
                  tiers: [
                    ...form.tiers,
                    {
                      qty: (form.tiers[form.tiers.length - 1]?.qty || 2) + 1,
                      discountType: 'percent',
                      value: 10,
                    },
                  ],
                })
              }
            >
              Add tier
            </button>
          </div>
          <div className="space-y-3">
            {form.tiers.map((tier, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-2xl border border-[#2d2b2b]/8 bg-[#faf7f2]/50 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <label className="block">
                  <span className="text-xs text-[#7a736c]">Buy quantity</span>
                  <input
                    className="input mt-1"
                    type="number"
                    min="2"
                    value={tier.qty}
                    onChange={(e) => {
                      const tiers = [...form.tiers];
                      tiers[i] = { ...tiers[i], qty: e.target.value };
                      patch({ tiers });
                    }}
                  />
                </label>
                <div className="block">
                  <span className="text-xs text-[#7a736c]">Discount type</span>
                  <div className="mt-1 flex gap-1 rounded-full border border-[#2d2b2b]/10 bg-white p-1">
                    {[
                      { id: 'percent', label: '%' },
                      { id: 'fixed', label: '₹' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const tiers = [...form.tiers];
                          tiers[i] = { ...tiers[i], discountType: opt.id };
                          patch({ tiers });
                        }}
                        className={`flex-1 rounded-full py-2 text-xs font-semibold ${
                          tier.discountType === opt.id
                            ? 'bg-[#5e062a] text-white'
                            : 'text-[#7a736c]'
                        }`}
                      >
                        {opt.label} {opt.id === 'percent' ? 'Percent' : 'Flat'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="text-xs text-[#7a736c]">
                    {tier.discountType === 'fixed' ? 'Flat ₹ off' : 'Percent off'}
                  </span>
                  <input
                    className="input mt-1"
                    type="number"
                    min="1"
                    max={tier.discountType === 'percent' ? 100 : undefined}
                    value={tier.value}
                    onChange={(e) => {
                      const tiers = [...form.tiers];
                      tiers[i] = { ...tiers[i], value: e.target.value };
                      patch({ tiers });
                    }}
                    placeholder={tier.discountType === 'fixed' ? '200' : '10'}
                  />
                </label>
                <button
                  type="button"
                  className="self-end pb-3 text-xs text-[#5e062a]"
                  onClick={() => patch({ tiers: form.tiers.filter((_, j) => j !== i) })}
                  disabled={form.tiers.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card space-y-4 p-6">
        <p className="font-label text-[10px] text-[#7a736c]">Where it applies</p>
        <DiscountScopePicker
          scope={form.scope}
          scopeValues={form.scopeValues}
          onScopeChange={(scope) => patch({ scope })}
          onValuesChange={(scopeValues) => patch({ scopeValues })}
          categories={categories}
          collections={collections}
          products={products}
        />
      </section>

      <section className="card space-y-4 p-6">
        <p className="font-label text-[10px] text-[#7a736c]">Schedule & status</p>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs text-[#7a736c]">Starts</span>
            <input
              className="input mt-1"
              type="datetime-local"
              value={toLocalInput(form.startsAt)}
              onChange={(e) => patch({ startsAt: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Ends (optional)</span>
            <input
              className="input mt-1"
              type="datetime-local"
              value={toLocalInput(form.endsAt)}
              onChange={(e) => patch({ endsAt: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Status</span>
            <select
              className="input mt-1"
              value={form.status}
              onChange={(e) => patch({ status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </label>
        </div>
      </section>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Saving…' : isBulk ? 'Save bulk offer' : 'Save promo code'}
      </button>
    </form>
  );
}

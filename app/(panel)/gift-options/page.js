'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_GIFT_OPTIONS } from '@/lib/gift-options';

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#2d2b2b]/8 bg-white px-4 py-4">
      <span>
        <span className="block text-sm font-medium text-[#2d2b2b]">{label}</span>
        {hint ? <span className="mt-1 block text-xs text-[#7a736c]">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#5e062a]' : 'bg-[#d8d0c6]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

function Field({ label, value, onChange, type = 'text', hint, as = 'input', maxLength }) {
  const Comp = as;
  return (
    <label className="block">
      <span className="font-label text-[10px] text-[#7a736c]">{label}</span>
      <Comp
        type={as === 'input' ? type : undefined}
        value={value}
        maxLength={maxLength}
        rows={as === 'textarea' ? 3 : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1.5 w-full"
      />
      {hint ? <span className="mt-1 block text-[11px] text-[#7a736c]">{hint}</span> : null}
    </label>
  );
}

export default function GiftOptionsPage() {
  const [form, setForm] = useState(DEFAULT_GIFT_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/gift-options', { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data.options) setForm({ ...DEFAULT_GIFT_OPTIONS, ...data.options });
        if (!cancelled && data.error && /relation|does not exist/i.test(data.error)) {
          setError(
            'Migration 014_gift_options not applied yet — defaults shown. Run the SQL in Supabase, then save.',
          );
        } else if (!cancelled && data.error && !data.options) {
          setError(data.error);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/gift-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setForm({ ...DEFAULT_GIFT_OPTIONS, ...data.options });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#7a736c]">Loading gift options…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="font-label text-[10px] text-[#d4af64]">Checkout</p>
        <h1 className="font-display mt-2 text-4xl">Gift options</h1>
        <p className="mt-2 max-w-xl text-sm font-light text-[#7a736c]">
          Control gift wrap and the custom note on cart and checkout. Turn either off anytime —
          fee, labels, and copy are editable here.
        </p>
      </div>

      {error ? <p className="text-sm text-[#5e062a]">{error}</p> : null}

      <form onSubmit={onSave} className="space-y-6">
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-label text-[10px] text-[#7a736c]">Gift wrap</p>
            <span className="font-num text-xs text-[#7a736c]">
              {form.giftWrapEnabled ? `+₹${form.giftWrapFee || 0}` : 'Off'}
            </span>
          </div>
          <Toggle
            checked={form.giftWrapEnabled}
            onChange={(v) => update('giftWrapEnabled', v)}
            label="Offer gift wrap"
            hint="When off, shoppers will not see the gift wrap option."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Fee (₹)"
              type="number"
              value={String(form.giftWrapFee ?? 25)}
              onChange={(v) => update('giftWrapFee', Math.max(0, Math.round(Number(v) || 0)))}
              hint="Charged once per order when selected."
            />
            <Field
              label="Label"
              value={form.giftWrapLabel}
              onChange={(v) => update('giftWrapLabel', v)}
            />
          </div>
          <Field
            label="Description"
            as="textarea"
            value={form.giftWrapDescription}
            onChange={(v) => update('giftWrapDescription', v)}
          />
        </section>

        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-label text-[10px] text-[#7a736c]">Custom message</p>
            <span className="text-xs text-[#7a736c]">
              {form.messageEnabled ? 'On' : 'Off'}
            </span>
          </div>
          <Toggle
            checked={form.messageEnabled}
            onChange={(v) => update('messageEnabled', v)}
            label="Offer a custom gift message"
            hint="Independent of gift wrap — you can offer a note without wrapping."
          />
          <Field
            label="Label"
            value={form.messageLabel}
            onChange={(v) => update('messageLabel', v)}
          />
          <Field
            label="Description"
            as="textarea"
            value={form.messageDescription}
            onChange={(v) => update('messageDescription', v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Placeholder"
              value={form.messagePlaceholder}
              onChange={(v) => update('messagePlaceholder', v)}
            />
            <Field
              label="Max characters"
              type="number"
              value={String(form.messageMaxLength ?? 200)}
              onChange={(v) =>
                update('messageMaxLength', Math.min(500, Math.max(20, Math.round(Number(v) || 200)))}
              }
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save gift options'}
          </button>
          {saved ? <span className="text-sm text-emerald-700">Saved</span> : null}
        </div>
      </form>
    </div>
  );
}

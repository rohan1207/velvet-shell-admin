'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/format';
import { DEFAULT_SHIPPING, normalizeShipping } from '@/lib/shipping';

function materialForColor(label = '') {
  const l = String(label).toLowerCase();
  if (/\bgold\b/.test(l)) return '18K Gold Plated';
  if (/\bsilver\b|sterling|925/.test(l)) return 'Sterling Silver';
  return 'Sterling Silver';
}

function newVariant(label = 'Default', swatch = '#C5C5C5', primary = true) {
  return {
    id: `tmp-${Math.random().toString(36).slice(2, 9)}`,
    colorLabel: label,
    colorSwatch: swatch,
    isPrimary: primary,
    price: 0,
    description: '',
    story: '',
    care: '',
    features: [],
    material: materialForColor(label),
    length: 'Adjustable',
    sizeTags: ['Adjustable'],
    reviews: { rating: 0, count: 0, highlights: [] },
    heroUrl: '',
    gallery: [],
    stock: 10,
    outOfStock: false,
    active: true,
  };
}

function featuresToText(features) {
  return Array.isArray(features) ? features.join('\n') : String(features || '');
}

function textToFeatures(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function galleryExtras(variant) {
  return (variant?.gallery || []).filter((g) => g?.url && g.url !== variant.heroUrl);
}

function galleryOrdered(variant) {
  return (variant?.gallery || []).filter((g) => g?.url);
}

/** Natural name sort so files named 1,2,3,10 upload in that order. */
function sortFilesByName(files = []) {
  return [...files].sort((a, b) =>
    String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

function mediaSummary(variant) {
  const extras = galleryExtras(variant);
  return {
    hasHero: !!variant?.heroUrl,
    galleryCount: extras.length,
  };
}

/** Stable snapshot for dirty checks (ignore UI-only activeVariantIndex). */
function serializeFormState(form, featuresText) {
  const variants = (form.variants || []).map((v, i) => {
    const features =
      i === form.activeVariantIndex ? textToFeatures(featuresText) : v.features || [];
    return {
      id: v.id,
      colorLabel: v.colorLabel,
      colorSwatch: v.colorSwatch,
      isPrimary: !!v.isPrimary,
      price: Number(v.price) || 0,
      description: v.description || '',
      story: v.story || '',
      care: v.care || '',
      features,
      material: v.material || '',
      length: v.length || '',
      sizeTags: Array.isArray(v.sizeTags) ? v.sizeTags : [],
      reviews: {
        rating: Number(v.reviews?.rating) || 0,
        count: Number(v.reviews?.count) || 0,
        highlights: v.reviews?.highlights || [],
      },
      heroUrl: v.heroUrl || '',
      gallery: Array.isArray(v.gallery) ? v.gallery : [],
      stock: Number(v.stock) || 0,
      outOfStock: !!v.outOfStock,
      active: v.active !== false,
    };
  });
  return JSON.stringify({
    name: form.name || '',
    slug: form.slug || '',
    category: form.category || '',
    collection: form.collection || '',
    badge: form.badge || '',
    status: form.status || 'draft',
    hasColorVariants: !!form.hasColorVariants,
    customizationEnabled: !!form.customizationEnabled,
    customizationFields: form.customizationFields || [],
    shipping: form.shipping || {},
    recommendedFamilyIds: form.recommendedFamilyIds || [],
    variants,
  });
}

/** Simple colour presets — Gold/Silver are colours (not a separate finish axis). */
const SWATCH_PRESETS = [
  { label: 'Gold', swatch: '#D4AF64' },
  { label: 'Silver', swatch: '#C5C5C5' },
  { label: 'Green', swatch: '#2F6B4F' },
  { label: 'Blue', swatch: '#4A7BA7' },
  { label: 'Pink', swatch: '#E8B4C4' },
  { label: 'White', swatch: '#F5F5F5' },
  { label: 'Purple', swatch: '#6B3FA0' },
  { label: 'Clear', swatch: '#E8EEF2' },
];

export default function ProductForm({
  initial,
  categories = [],
  collections = [],
  allProducts = [],
  lockSlug = false,
  onSave,
  saving = false,
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => {
    if (!initial) {
      return {
        name: '',
        slug: '',
        category: categories[0]?.slug || 'rings',
        collection: collections[0]?.slug || 'the-shell-edit',
        badge: '',
        status: 'draft',
        hasColorVariants: false,
        customizationEnabled: false,
        customizationFields: [],
        shipping: normalizeShipping(DEFAULT_SHIPPING),
        recommendedFamilyIds: [],
        variants: [newVariant()],
        activeVariantIndex: 0,
      };
    }
    return {
      ...initial,
      customizationEnabled: !!initial.customizationEnabled,
      customizationFields: Array.isArray(initial.customizationFields)
        ? initial.customizationFields
        : [],
      shipping: normalizeShipping(initial.shipping),
      recommendedFamilyIds: initial.recommendedFamilyIds || [],
      variants: (initial.variants?.length ? initial.variants : [newVariant()]).map((v) => {
        const sizeTags = Array.isArray(v.sizeTags)
          ? v.sizeTags.map((t) => String(t || '').trim()).filter(Boolean)
          : [];
        const length = String(v.length || '').trim();
        return {
          ...newVariant(),
          ...v,
          features: Array.isArray(v.features) ? v.features : [],
          reviews: v.reviews || { rating: 0, count: 0, highlights: [] },
          gallery: Array.isArray(v.gallery) ? v.gallery : [],
          sizeTags: sizeTags.length ? sizeTags : length ? [length] : [],
          length: length || sizeTags[0] || '',
        };
      }),
      activeVariantIndex: 0,
    };
  });

  const [featuresText, setFeaturesText] = useState(() =>
    featuresToText(form.variants[0]?.features)
  );
  const [sizeTagDraft, setSizeTagDraft] = useState('');
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { current, total }
  const [dragGalleryIndex, setDragGalleryIndex] = useState(null);
  const [dragOverGalleryIndex, setDragOverGalleryIndex] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState('');
  const [leaveSaving, setLeaveSaving] = useState(false);
  const baselineRef = useRef(null);
  const allowLeaveRef = useRef(false);
  /** Always-current form snapshot — Save/upload must not rely on stale closures. */
  const formRef = useRef(form);
  formRef.current = form;
  const featuresTextRef = useRef(featuresText);
  featuresTextRef.current = featuresText;
  const mediaBusy = uploadingHero || uploadingGallery;

  if (baselineRef.current === null) {
    baselineRef.current = serializeFormState(form, featuresText);
  }

  const isDirty = useMemo(
    () => serializeFormState(form, featuresText) !== baselineRef.current,
    [form, featuresText],
  );

  const autoSlug = useMemo(() => slugify(form.name), [form.name]);
  const familySlug = lockSlug ? form.slug : autoSlug;
  const variant = form.variants[form.activeVariantIndex] || form.variants[0];
  const colorLabel = form.hasColorVariants
    ? variant?.colorLabel || 'this colour'
    : 'this product';
  const activeMedia = mediaSummary(variant);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isDirty || allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onClick = (event) => {
      if (!isDirty || allowLeaveRef.current || leaveOpen) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target?.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        setPendingHref(`${url.pathname}${url.search}${url.hash}`);
        setLeaveOpen(true);
      } catch {
        /* ignore bad hrefs */
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isDirty, leaveOpen]);

  function patchForm(patch) {
    const next = { ...formRef.current, ...patch };
    formRef.current = next;
    setForm(next);
  }

  function patchVariant(index, patch) {
    const f = formRef.current;
    const variants = f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    const next = { ...f, variants };
    formRef.current = next;
    setForm(next);
  }

  function switchVariant(index) {
    const f = formRef.current;
    const variants = f.variants.map((v, i) =>
      i === f.activeVariantIndex
        ? { ...v, features: textToFeatures(featuresTextRef.current) }
        : v,
    );
    const next = { ...f, variants, activeVariantIndex: index };
    formRef.current = next;
    setForm(next);
    setFeaturesText(featuresToText(variants[index]?.features));
    setSizeTagDraft('');
    setNotice(
      next.hasColorVariants
        ? `Editing ${variants[index]?.colorLabel || 'colour'} — hero & gallery below are only for this colour.`
        : '',
    );
  }

  function addColor(preset) {
    const colour = newVariant(preset.label, preset.swatch, false);
    colour.material = materialForColor(preset.label);
    const f = formRef.current;
    const variants = [...f.variants, colour];
    const next = {
      ...f,
      hasColorVariants: true,
      variants,
      activeVariantIndex: variants.length - 1,
    };
    formRef.current = next;
    setForm(next);
    setFeaturesText('');
    setNotice(
      `Added ${preset.label}. Upload only ${preset.label} photos on this colour tab — do not mix metals in one gallery.`,
    );
  }

  function importFromVariant(sourceIndex) {
    const source = form.variants[sourceIndex];
    if (!source) return;
    const idx = form.activeVariantIndex;
    patchVariant(idx, {
      price: source.price,
      description: source.description,
      features: [...(source.features || [])],
      material: source.material,
      length: source.length,
      sizeTags: [...(source.sizeTags || [])],
      reviews: { ...source.reviews, highlights: [...(source.reviews?.highlights || [])] },
      stock: source.stock,
      // intentionally NOT copying heroUrl / gallery
    });
    setFeaturesText(featuresToText(source.features));
    setNotice('Copied details from that color. Images/videos were left empty for this swatch.');
  }

  async function uploadFile(file) {
    const body = new FormData();
    body.append('file', file);
    body.append('folder', 'products');
    const res = await fetch('/api/upload', { method: 'POST', body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return {
      url: data.url,
      kind: data.kind || (file.type.startsWith('video/') ? 'video' : 'image'),
      alt: form.name,
    };
  }

  async function uploadMany(files, { onProgress } = {}) {
    const uploaded = [];
    const total = files.length;
    for (let i = 0; i < files.length; i += 1) {
      onProgress?.({ current: i + 1, total });
      uploaded.push(await uploadFile(files[i]));
    }
    return uploaded;
  }

  /** Merge media into formRef + state synchronously (safe after await upload). */
  function applyVariantMedia(mutator) {
    const f = formRef.current;
    const idx = f.activeVariantIndex;
    const current = f.variants[idx] || f.variants[0];
    if (!current) return f;
    const patch = mutator(current, idx, f) || {};
    const variants = f.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v));
    const nextSnapshot = { ...f, variants };
    formRef.current = nextSnapshot;
    setForm(nextSnapshot);
    return nextSnapshot;
  }

  function buildPayload(fromForm = formRef.current) {
    const featuresNow = featuresTextRef.current;
    const resolvedSlug = lockSlug
      ? fromForm.slug || slugify(fromForm.name)
      : slugify(fromForm.name);
    const variants = (fromForm.variants || []).map((v, i) => {
      const features =
        i === fromForm.activeVariantIndex ? textToFeatures(featuresNow) : v.features || [];
      const sizeTags = Array.isArray(v.sizeTags)
        ? v.sizeTags.map((t) => String(t || '').trim()).filter(Boolean)
        : [];
      const length = sizeTags[0] || String(v.length || '').trim();
      const gallery = Array.isArray(v.gallery)
        ? v.gallery
            .map((g) => {
              if (typeof g === 'string') return { url: g, kind: 'image' };
              if (g?.url) return { url: g.url, kind: g.kind || 'image', alt: g.alt || '' };
              return null;
            })
            .filter(Boolean)
        : [];
      const heroUrl = String(v.heroUrl || gallery[0]?.url || '').trim();
      return {
        ...v,
        features,
        sizeTags,
        length,
        price: Number(v.price) || 0,
        stock: Number(v.stock) || 0,
        heroUrl,
        gallery,
      };
    });

    return {
      id: fromForm.id || null,
      name: fromForm.name,
      slug: resolvedSlug,
      category: fromForm.category,
      collection: fromForm.collection,
      badge: fromForm.badge,
      status: fromForm.status,
      hasColorVariants: fromForm.hasColorVariants,
      customizationEnabled: !!fromForm.customizationEnabled,
      customizationFields: fromForm.customizationEnabled
        ? (fromForm.customizationFields || [])
            .map((field, index) => ({
              id: field.id || `field_${index + 1}`,
              label: String(field.label || '').trim(),
              inputType: ['text', 'number', 'textarea'].includes(field.inputType)
                ? field.inputType
                : 'text',
              required: !!field.required,
              placeholder: String(field.placeholder || '').trim(),
            }))
            .filter((field) => field.label)
        : [],
      shipping: normalizeShipping(fromForm.shipping),
      recommendedFamilyIds: fromForm.recommendedFamilyIds,
      variants,
    };
  }

  function markClean(fromForm = formRef.current) {
    baselineRef.current = serializeFormState(fromForm, featuresTextRef.current);
  }

  async function persist(fromForm) {
    setError('');
    const latest = fromForm || formRef.current;
    const payload = buildPayload(latest);
    console.log(
      '[ProductForm persist] media payload',
      payload.variants.map((v) => ({
        id: v.id,
        color: v.colorLabel,
        heroUrl: v.heroUrl || '(empty)',
        gallery: (v.gallery || []).length,
        urls: (v.gallery || []).slice(0, 3).map((g) => g.url),
      })),
    );
    const saved = await onSave(payload);
    // Keep local form aligned with what the API actually stored
    if (saved?.variants) {
      const synced = {
        ...latest,
        id: saved.id || latest.id,
        slug: saved.slug || latest.slug,
        variants: (saved.variants || []).map((sv, i) => {
          const prev = latest.variants?.[i] || latest.variants?.find((x) => x.id === sv.id) || {};
          return {
            ...prev,
            ...sv,
            heroUrl: sv.heroUrl || '',
            gallery: Array.isArray(sv.gallery) ? sv.gallery : [],
          };
        }),
        activeVariantIndex: Math.min(
          latest.activeVariantIndex || 0,
          Math.max(0, (saved.variants || []).length - 1),
        ),
      };
      formRef.current = synced;
      setForm(synced);
      markClean(synced);
    } else {
      markClean(latest);
    }
    return saved;
  }

  /** For existing products, save media to DB immediately so the storefront updates. */
  async function persistMediaIfPossible(snapshot, successNotice) {
    const latest = snapshot || formRef.current;
    if (!latest?.id) {
      setNotice(`${successNotice} Click Save to keep images.`);
      return;
    }
    try {
      await persist(latest);
      setNotice(`${successNotice} Saved.`);
    } catch (err) {
      setNotice(`${successNotice} Click Save — auto-save failed.`);
      setError(err.message || 'Could not auto-save images');
      console.error('[ProductForm] auto-save media failed', err);
    }
  }

  async function onHeroFileSelected(event) {
    const files = sortFilesByName(Array.from(event.target.files || []));
    event.target.value = '';
    if (!files.length) return;
    setError('');
    setNotice('');
    setUploadingHero(true);
    setUploadProgress({ current: 0, total: files.length });
    try {
      const uploaded = await uploadMany(files, { onProgress: setUploadProgress });
      const [hero, ...rest] = uploaded;
      console.log(
        '[ProductForm] hero upload ok',
        uploaded.map((u) => u.url),
      );
      const snapshot = applyVariantMedia((current) => {
        const gallery = [...(current.gallery || [])];
        const withoutOldHero = gallery.filter((g) => g.url !== current.heroUrl);
        return {
          heroUrl: hero.url,
          gallery: [
            hero,
            ...withoutOldHero.filter((g) => g.url !== hero.url),
            ...rest.filter((item) => item.url !== hero.url),
          ],
        };
      });
      await persistMediaIfPossible(
        snapshot,
        files.length === 1
          ? 'Hero uploaded.'
          : `Hero set · ${rest.length} more added to gallery.`,
      );
    } catch (err) {
      setError(err.message);
      console.error('[ProductForm] hero upload failed', err);
    } finally {
      setUploadingHero(false);
      setUploadProgress(null);
    }
  }

  async function onGalleryFilesSelected(event) {
    const files = sortFilesByName(Array.from(event.target.files || []));
    event.target.value = '';
    if (!files.length) return;
    setError('');
    setNotice('');
    setUploadingGallery(true);
    setUploadProgress({ current: 0, total: files.length });
    try {
      const uploaded = await uploadMany(files, { onProgress: setUploadProgress });
      console.log(
        '[ProductForm] gallery upload ok',
        uploaded.map((u) => u.url),
      );
      const snapshot = applyVariantMedia((current) => {
        const existing = current.gallery || [];
        const seen = new Set(existing.map((g) => g?.url).filter(Boolean));
        const fresh = uploaded.filter((item) => {
          if (seen.has(item.url)) return false;
          seen.add(item.url);
          return true;
        });
        const gallery = [...existing, ...fresh];
        return {
          gallery,
          heroUrl: current.heroUrl || gallery[0]?.url || '',
        };
      });
      await persistMediaIfPossible(
        snapshot,
        uploaded.length === 1
          ? 'Gallery image uploaded.'
          : `${uploaded.length} gallery images uploaded.`,
      );
    } catch (err) {
      setError(err.message);
      console.error('[ProductForm] gallery upload failed', err);
    } finally {
      setUploadingGallery(false);
      setUploadProgress(null);
    }
  }

  function reorderGallery(fromIndex, toIndex) {
    const snapshot = applyVariantMedia((current) => {
      const list = galleryOrdered(current);
      if (
        fromIndex == null ||
        toIndex == null ||
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= list.length ||
        toIndex >= list.length
      ) {
        return {};
      }
      const next = [...list];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return {
        gallery: next,
        heroUrl: next[0]?.url || '',
      };
    });
    void persistMediaIfPossible(snapshot, 'Gallery order updated. First image is the hero.');
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await persist();
      setNotice('Product saved.');
    } catch (err) {
      setError(err.message || 'Save failed');
    }
  }

  function stayOnPage() {
    setLeaveOpen(false);
    setPendingHref('');
  }

  function discardAndLeave() {
    allowLeaveRef.current = true;
    setLeaveOpen(false);
    const href = pendingHref || '/products';
    setPendingHref('');
    router.push(href);
  }

  async function saveAndLeave() {
    setLeaveSaving(true);
    setError('');
    try {
      await persist();
      allowLeaveRef.current = true;
      setLeaveOpen(false);
      const href = pendingHref || '/products';
      setPendingHref('');
      router.push(href);
    } catch (err) {
      setError(err.message || 'Save failed');
      setLeaveOpen(false);
    } finally {
      setLeaveSaving(false);
    }
  }

  function addCustomizationField() {
    patchForm({
      customizationFields: [
        ...(form.customizationFields || []),
        {
          id: `field_${Math.random().toString(36).slice(2, 8)}`,
          label: '',
          inputType: 'text',
          required: false,
          placeholder: '',
        },
      ],
    });
  }

  function patchCustomizationField(index, patch) {
    const next = (form.customizationFields || []).map((field, i) =>
      i === index ? { ...field, ...patch } : field,
    );
    patchForm({ customizationFields: next });
  }

  function removeCustomizationField(index) {
    patchForm({
      customizationFields: (form.customizationFields || []).filter((_, i) => i !== index),
    });
  }

  return (
    <form onSubmit={submit} className="relative space-y-8">
      {saving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d2b2b]/45 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="mx-4 flex max-w-sm flex-col items-center gap-4 rounded-2xl bg-white px-8 py-7 shadow-lg">
            <span
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#5e062a]/20 border-t-[#5e062a]"
              aria-hidden
            />
            <div className="text-center">
              <p className="text-sm font-medium text-[#2d2b2b]">Saving product…</p>
              <p className="mt-1 text-xs text-[#7a736c]">Please wait — this may take a moment.</p>
            </div>
          </div>
        </div>
      )}

      {(notice || error) && (
        <p className={`text-sm ${error ? 'text-[#5e062a]' : 'text-[#7a736c]'}`}>{error || notice}</p>
      )}

      {/* Basics */}
      <section className="card space-y-4 p-6">
        <p className="font-label text-[10px] text-[#7a736c]">Basics</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-xs text-[#7a736c]">Name</span>
            <input
              className="input mt-1"
              required
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Slug</span>
            <input className="input mt-1 bg-[#faf7f2]" value={familySlug} readOnly />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Badge</span>
            <input
              className="input mt-1"
              value={form.badge}
              onChange={(e) => patchForm({ badge: e.target.value })}
              placeholder="New · Floral"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Category</span>
            <select
              className="input mt-1"
              value={form.category}
              onChange={(e) => patchForm({ category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Collection</span>
            <select
              className="input mt-1"
              value={form.collection}
              onChange={(e) => patchForm({ collection: e.target.value })}
            >
              {collections.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Status</span>
            <select
              className="input mt-1"
              value={form.status}
              onChange={(e) => patchForm({ status: e.target.value })}
            >
              <option value="active">Active (live on site)</option>
              <option value="draft">Draft</option>
            </select>
          </label>
        </div>
      </section>

      {/* Colour variants — Gold / Silver / stone colours */}
      <section className="card space-y-4 p-6">
        <div>
          <p className="font-label text-[10px] text-[#7a736c]">Colour variants</p>
          <p className="mt-1 text-sm text-[#7a736c]">
            Add colours like Gold, Silver, Green, Blue… Each colour has its own price, stock, and
            images. Keep the product name and description exactly as provided.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.hasColorVariants}
            onChange={(e) => {
              const on = e.target.checked;
              if (!on) {
                patchForm({
                  hasColorVariants: false,
                  variants: [{ ...form.variants[0], colorLabel: 'Default', isPrimary: true }],
                  activeVariantIndex: 0,
                });
                setFeaturesText(featuresToText(form.variants[0]?.features));
              } else {
                patchForm({ hasColorVariants: true });
              }
            }}
          />
          This product has more than one colour?
        </label>

        {form.hasColorVariants && (
          <div className="space-y-3">
            <p className="text-sm text-[#7a736c]">
              Select a colour tab below, set price/stock, then upload that colour&apos;s hero and
              gallery. Images stay with that colour only.
            </p>
            <div className="flex flex-wrap gap-2">
              {form.variants.map((v, i) => {
                const media = mediaSummary(v);
                const selected = i === form.activeVariantIndex;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => switchVariant(i)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                      selected
                        ? 'border-[#5e062a] bg-[#5e062a] text-white'
                        : 'border-[#2d2b2b]/15 bg-white text-[#2d2b2b]'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/10"
                      style={{ background: v.colorSwatch }}
                    />
                    {v.colorLabel}
                    {v.isPrimary ? ' · primary' : ''}
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                        selected ? 'bg-white/20 text-white' : 'bg-[#faf7f2] text-[#7a736c]'
                      }`}
                    >
                      {media.hasHero ? 'hero' : 'no hero'}
                      {media.galleryCount ? ` · ${media.galleryCount}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {SWATCH_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="rounded-full border border-[#2d2b2b]/12 px-3 py-1 text-[11px]"
                  onClick={() => addColor(preset)}
                >
                  + {preset.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded-full border border-dashed border-[#2d2b2b]/25 px-3 py-1 text-[11px]"
                onClick={() => addColor({ label: `Color ${form.variants.length + 1}`, swatch: '#CCCCCC' })}
              >
                + Custom color
              </button>
            </div>
            {form.variants.length > 1 && (
              <label className="block max-w-xs">
                <span className="text-xs text-[#7a736c]">Import details from</span>
                <select
                  className="input mt-1"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value === '') return;
                    importFromVariant(Number(e.target.value));
                    e.target.value = '';
                  }}
                >
                  <option value="">Choose a color…</option>
                  {form.variants.map((v, i) =>
                    i === form.activeVariantIndex ? null : (
                      <option key={v.id} value={i}>
                        {v.colorLabel}
                      </option>
                    )
                  )}
                </select>
              </label>
            )}
          </div>
        )}
      </section>

      {/* Active variant details */}
      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-label text-[10px] text-[#7a736c]">
              {form.hasColorVariants ? `Variant · ${variant.colorLabel}` : 'Product details'}
            </p>
            <p className="mt-1 text-sm text-[#7a736c]">
              {form.hasColorVariants
                ? `Details and images for ${variant.colorLabel} only — other colours stay untouched.`
                : 'Product details and media for this listing.'}
            </p>
          </div>
          {form.hasColorVariants && (
            <div className="flex flex-wrap gap-3">
              <label className="block">
                <span className="text-xs text-[#7a736c]">Color name</span>
                <input
                  className="input mt-1"
                  value={variant.colorLabel}
                  onChange={(e) => {
                    const colorLabel = e.target.value;
                    const next = { colorLabel };
                    const inferred = materialForColor(colorLabel);
                    if (inferred && (colorLabel || '').trim()) {
                      next.material = inferred;
                    }
                    patchVariant(form.activeVariantIndex, next);
                  }}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[#7a736c]">Swatch</span>
                <input
                  className="input mt-1 h-11 w-20 p-1"
                  type="color"
                  value={variant.colorSwatch || '#C5C5C5'}
                  onChange={(e) =>
                    patchVariant(form.activeVariantIndex, { colorSwatch: e.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={!!variant.isPrimary}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.map((v, i) => ({
                        ...v,
                        isPrimary: on ? i === f.activeVariantIndex : v.isPrimary,
                      })),
                    }));
                  }}
                />
                Primary listing color
              </label>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs text-[#7a736c]">Price (INR)</span>
            <input
              className="input mt-1"
              type="number"
              min="0"
              required
              value={variant.price}
              onChange={(e) =>
                patchVariant(form.activeVariantIndex, { price: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Stock</span>
            <input
              className="input mt-1"
              type="number"
              min="0"
              value={variant.stock}
              onChange={(e) =>
                patchVariant(form.activeVariantIndex, { stock: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Material</span>
            <input
              className="input mt-1"
              value={variant.material}
              onChange={(e) =>
                patchVariant(form.activeVariantIndex, { material: e.target.value })
              }
              placeholder="Sterling Silver or 18K Gold Plated"
            />
          </label>
          <div className="block md:col-span-2">
            <span className="text-xs text-[#7a736c]">Size pills / tags</span>
            <p className="mt-1 text-[11px] leading-relaxed text-[#9a928a]">
              Shown as Measure pills on the product page. Add size notes for petite pieces (e.g.
              “Petite · ~1 cm”).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(variant.sizeTags?.length ? variant.sizeTags : []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e6dfd4] bg-[#faf7f2] px-3 py-1.5 text-[11px] tracking-[0.06em] text-[#3a342f]"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    className="text-[#9a928a] transition-colors hover:text-[#5E062A]"
                    onClick={() => {
                      const next = (variant.sizeTags || []).filter((t) => t !== tag);
                      patchVariant(form.activeVariantIndex, {
                        sizeTags: next,
                        length: next[0] || '',
                      });
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {!variant.sizeTags?.length ? (
                <span className="rounded-full border border-dashed border-[#e6dfd4] px-3 py-1.5 text-[11px] text-[#9a928a]">
                  No size pills yet — storefront shows “One size”
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                className="input min-w-[14rem] flex-1"
                value={sizeTagDraft}
                onChange={(e) => setSizeTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const tag = sizeTagDraft.trim();
                  if (!tag) return;
                  const existing = variant.sizeTags || [];
                  if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) {
                    setSizeTagDraft('');
                    return;
                  }
                  const next = [...existing, tag];
                  patchVariant(form.activeVariantIndex, {
                    sizeTags: next,
                    length: next[0] || '',
                  });
                  setSizeTagDraft('');
                }}
                placeholder="e.g. Petite · ~1 cm"
              />
              <button
                type="button"
                className="rounded-full border border-[#e6dfd4] bg-white px-4 py-2 text-[11px] tracking-[0.12em] text-[#3a342f] uppercase transition-colors hover:border-[#5E062A]/35 hover:text-[#5E062A]"
                onClick={() => {
                  const tag = sizeTagDraft.trim();
                  if (!tag) return;
                  const existing = variant.sizeTags || [];
                  if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) {
                    setSizeTagDraft('');
                    return;
                  }
                  const next = [...existing, tag];
                  patchVariant(form.activeVariantIndex, {
                    sizeTags: next,
                    length: next[0] || '',
                  });
                  setSizeTagDraft('');
                }}
              >
                Add pill
              </button>
            </div>
          </div>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Review rating (0–5)</span>
            <input
              className="input mt-1"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={variant.reviews?.rating ?? 0}
              onChange={(e) =>
                patchVariant(form.activeVariantIndex, {
                  reviews: { ...variant.reviews, rating: e.target.value },
                })
              }
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Review count</span>
            <input
              className="input mt-1"
              type="number"
              min="0"
              value={variant.reviews?.count ?? 0}
              onChange={(e) =>
                patchVariant(form.activeVariantIndex, {
                  reviews: { ...variant.reviews, count: e.target.value },
                })
              }
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-[#7a736c]">Description</span>
          <textarea
            className="input mt-1 min-h-28 rounded-2xl"
            value={variant.description}
            onChange={(e) =>
              patchVariant(form.activeVariantIndex, { description: e.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">The piece (story)</span>
          <textarea
            className="input mt-1 min-h-24 rounded-2xl"
            value={variant.story || ''}
            onChange={(e) =>
              patchVariant(form.activeVariantIndex, { story: e.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Care</span>
          <textarea
            className="input mt-1 min-h-24 rounded-2xl"
            value={variant.care || ''}
            onChange={(e) =>
              patchVariant(form.activeVariantIndex, { care: e.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Features (one per line)</span>
          <textarea
            className="input mt-1 min-h-28 rounded-2xl"
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            placeholder={'S925 silver\nHandmade in Jaipur\nAdjustable extender'}
          />
        </label>
      </section>

      {/* Media — always scoped to the active colour / product */}
      <section className="card space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-label text-[10px] text-[#7a736c]">
              {form.hasColorVariants
                ? `Images for ${variant.colorLabel}`
                : 'Hero & gallery'}
            </p>
            <p className="mt-1 text-sm font-light text-[#7a736c]">
              {form.hasColorVariants
                ? `Hero and gallery below belong only to ${colorLabel}. Switch colour tabs above to manage other colours — images are never mixed.`
                : 'Upload a hero and gallery — you can select multiple images at once. Files go to Cloudflare R2.'}
            </p>
          </div>
          {form.hasColorVariants ? (
            <div className="flex items-center gap-2 rounded-full border border-[#2d2b2b]/10 bg-[#faf7f2] px-3 py-1.5 text-xs text-[#2d2b2b]">
              <span
                className="h-3 w-3 rounded-full border border-black/10"
                style={{ background: variant.colorSwatch }}
              />
              {variant.colorLabel}
              <span className="text-[#7a736c]">
                · {activeMedia.hasHero ? 'hero set' : 'needs hero'}
                {activeMedia.galleryCount
                  ? ` · ${activeMedia.galleryCount} gallery`
                  : ' · no gallery'}
              </span>
            </div>
          ) : null}
        </div>

        {form.hasColorVariants && form.variants.length > 1 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {form.variants.map((v, i) => {
              const media = mediaSummary(v);
              const selected = i === form.activeVariantIndex;
              return (
                <button
                  key={`media-card-${v.id}`}
                  type="button"
                  onClick={() => switchVariant(i)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    selected
                      ? 'border-[#5e062a] bg-[#5e062a]/5'
                      : 'border-[#2d2b2b]/8 bg-white hover:border-[#2d2b2b]/20'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-[#2d2b2b]">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/10"
                      style={{ background: v.colorSwatch }}
                    />
                    {v.colorLabel}
                    {selected ? (
                      <span className="text-[10px] uppercase tracking-wider text-[#5e062a]">
                        editing
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-[#7a736c]">
                    {media.hasHero ? 'Hero ✓' : 'Hero missing'}
                    {' · '}
                    {media.galleryCount
                      ? `${media.galleryCount} gallery image${media.galleryCount === 1 ? '' : 's'}`
                      : 'No gallery yet'}
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="space-y-3 rounded-2xl border border-[#2d2b2b]/8 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#2d2b2b]">
              Hero image
              {form.hasColorVariants ? (
                <span className="font-normal text-[#7a736c]"> · {variant.colorLabel} only</span>
              ) : null}
            </p>
            {uploadingHero && (
              <span className="inline-flex items-center gap-2 text-xs text-[#7a736c]">
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#5e062a]/20 border-t-[#5e062a]"
                  aria-hidden
                />
                {uploadProgress?.total > 1
                  ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}…`
                  : 'Uploading hero…'}
              </span>
            )}
          </div>
          {variant.heroUrl ? (
            <div className="relative max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={variant.heroUrl}
                alt=""
                className="max-h-56 w-full rounded-xl object-cover"
              />
              {uploadingHero ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                  <span className="inline-flex items-center gap-2 text-sm text-[#7a736c]">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-[#5e062a]/20 border-t-[#5e062a]"
                      aria-hidden
                    />
                    {uploadProgress?.total > 1
                      ? `${uploadProgress.current}/${uploadProgress.total}`
                      : 'Uploading…'}
                  </span>
                </div>
              ) : null}
              <button
                type="button"
                disabled={mediaBusy || saving}
                className="mt-2 text-[10px] uppercase tracking-wider text-[#5e062a] disabled:opacity-50"
                onClick={() =>
                  patchVariant(form.activeVariantIndex, {
                    heroUrl: '',
                    gallery: (variant.gallery || []).filter((g) => g.url !== variant.heroUrl),
                  })
                }
              >
                Remove hero
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#7a736c]">
              {uploadingHero
                ? 'Uploading hero…'
                : form.hasColorVariants
                  ? `No hero for ${variant.colorLabel} yet.`
                  : 'No hero image yet.'}
            </p>
          )}
          <label
            className={`btn-ghost inline-flex cursor-pointer ${mediaBusy || saving ? 'pointer-events-none opacity-50' : ''}`}
          >
            {variant.heroUrl
              ? `Replace ${form.hasColorVariants ? `${variant.colorLabel} ` : ''}hero`
              : `Upload ${form.hasColorVariants ? `${variant.colorLabel} ` : ''}hero`}
            <input
              className="hidden"
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={mediaBusy || saving}
              onChange={onHeroFileSelected}
            />
          </label>
          <p className="text-[11px] text-[#7a736c]">
            You can select multiple files — first becomes hero, the rest join the gallery.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#2d2b2b]/8 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#2d2b2b]">
              Gallery images
              {form.hasColorVariants ? (
                <span className="font-normal text-[#7a736c]"> · {variant.colorLabel} only</span>
              ) : null}
            </p>
            {uploadingGallery && (
              <span className="inline-flex items-center gap-2 text-xs text-[#7a736c]">
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#5e062a]/20 border-t-[#5e062a]"
                  aria-hidden
                />
                {uploadProgress?.total > 1
                  ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}…`
                  : 'Uploading gallery…'}
              </span>
            )}
          </div>
          <div className="relative grid gap-3 sm:grid-cols-3">
            {uploadingGallery ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px] sm:col-span-3">
                <span className="inline-flex items-center gap-2 text-sm text-[#7a736c]">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-[#5e062a]/20 border-t-[#5e062a]"
                    aria-hidden
                  />
                  {uploadProgress?.total > 1
                    ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}…`
                    : 'Uploading images…'}
                </span>
              </div>
            ) : null}
            {galleryOrdered(variant).map((item, i) => {
              const isHero = item.url === variant.heroUrl || i === 0;
              const isDragging = dragGalleryIndex === i;
              const isOver = dragOverGalleryIndex === i && dragGalleryIndex !== i;
              return (
                <div
                  key={`${item.url}-${i}`}
                  draggable={!mediaBusy && !saving}
                  onDragStart={(e) => {
                    setDragGalleryIndex(i);
                    e.dataTransfer.effectAllowed = 'move';
                    try {
                      e.dataTransfer.setData('text/plain', String(i));
                    } catch {
                      /* ignore */
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverGalleryIndex !== i) setDragOverGalleryIndex(i);
                  }}
                  onDragLeave={() => {
                    if (dragOverGalleryIndex === i) setDragOverGalleryIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragGalleryIndex;
                    setDragGalleryIndex(null);
                    setDragOverGalleryIndex(null);
                    reorderGallery(from, i);
                  }}
                  onDragEnd={() => {
                    setDragGalleryIndex(null);
                    setDragOverGalleryIndex(null);
                  }}
                  className={`relative cursor-grab rounded-xl border p-2 active:cursor-grabbing ${
                    isDragging
                      ? 'border-[#5e062a]/40 opacity-50'
                      : isOver
                        ? 'border-[#5e062a] bg-[#5e062a]/5'
                        : 'border-[#2d2b2b]/8'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium tracking-wider text-[#7a736c] uppercase">
                      {i + 1}
                      {isHero ? ' · Hero' : ''}
                    </span>
                    <span className="text-[10px] text-[#7a736c]" aria-hidden>
                      ⋮⋮
                    </span>
                  </div>
                  {item.kind === 'video' ? (
                    <video src={item.url} className="h-28 w-full rounded-lg object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" className="h-28 w-full rounded-lg object-cover" />
                  )}
                  <button
                    type="button"
                    disabled={mediaBusy || saving}
                    className="mt-2 text-[10px] uppercase tracking-wider text-[#5e062a] disabled:opacity-50"
                    onClick={() => {
                      const next = galleryOrdered(variant).filter((g) => g.url !== item.url);
                      patchVariant(form.activeVariantIndex, {
                        gallery: next,
                        heroUrl:
                          item.url === variant.heroUrl ? next[0]?.url || '' : variant.heroUrl || next[0]?.url || '',
                      });
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          {!galleryOrdered(variant).length && (
            <p className="text-sm text-[#7a736c]">
              {form.hasColorVariants
                ? `No gallery images for ${variant.colorLabel} yet.`
                : 'No gallery images yet.'}
            </p>
          )}
          <label
            className={`btn-ghost inline-flex cursor-pointer ${mediaBusy || saving ? 'pointer-events-none opacity-50' : ''}`}
          >
            {form.hasColorVariants
              ? `Add ${variant.colorLabel} gallery images`
              : 'Add gallery images'}
            <input
              className="hidden"
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={mediaBusy || saving}
              onChange={onGalleryFilesSelected}
            />
          </label>
          <p className="text-[11px] text-[#7a736c]">
            Select multiple at once (named 1, 2, 3… keep that order). Drag tiles to rearrange — this
            sequence is used on the storefront. First image is the hero.
          </p>
        </div>
      </section>

      {/* Customization */}
      <section className="card space-y-4 p-6">
        <div>
          <p className="font-label text-[10px] text-[#7a736c]">Customization</p>
          <p className="mt-1 text-sm text-[#7a736c]">
            Let shoppers answer free-form prompts for this piece (length, message, initials…).
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={!!form.customizationEnabled}
            onChange={(e) => {
              const on = e.target.checked;
              patchForm({
                customizationEnabled: on,
                customizationFields:
                  on && !(form.customizationFields || []).length
                    ? [
                        {
                          id: `field_${Math.random().toString(36).slice(2, 8)}`,
                          label: 'Specify the dangles length',
                          inputType: 'text',
                          required: false,
                          placeholder: 'e.g. 2.5 inches',
                        },
                      ]
                    : form.customizationFields || [],
              });
            }}
          />
          Customization available?
        </label>

        {form.customizationEnabled ? (
          <div className="space-y-3">
            {(form.customizationFields || []).map((field, index) => (
              <div
                key={field.id || index}
                className="grid gap-3 rounded-xl border border-[#2d2b2b]/8 bg-[#faf7f2]/70 p-4 md:grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1fr)_auto]"
              >
                <label className="block">
                  <span className="text-xs text-[#7a736c]">Prompt shown to shopper</span>
                  <input
                    className="input mt-1"
                    value={field.label}
                    placeholder="e.g. Specify the dangles length"
                    onChange={(e) => patchCustomizationField(index, { label: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[#7a736c]">Input type</span>
                  <select
                    className="input mt-1"
                    value={field.inputType || 'text'}
                    onChange={(e) => patchCustomizationField(index, { inputType: e.target.value })}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="textarea">Long text</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-[#7a736c]">Placeholder</span>
                  <input
                    className="input mt-1"
                    value={field.placeholder || ''}
                    placeholder="Optional hint"
                    onChange={(e) =>
                      patchCustomizationField(index, { placeholder: e.target.value })
                    }
                  />
                </label>
                <div className="flex items-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-xs text-[#7a736c]">
                    <input
                      type="checkbox"
                      checked={!!field.required}
                      onChange={(e) =>
                        patchCustomizationField(index, { required: e.target.checked })
                      }
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    className="text-xs text-[#5e062a] hover:underline"
                    onClick={() => removeCustomizationField(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={addCustomizationField}>
              + Add prompt
            </button>
          </div>
        ) : null}
      </section>

      {/* Recommendations */}
      <section className="card space-y-4 p-6">
        <p className="font-label text-[10px] text-[#7a736c]">Recommendations</p>
        <p className="text-sm font-light text-[#7a736c]">
          Select other products to show as “You may also like”.
        </p>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-[#2d2b2b]/8 p-3">
          {allProducts
            .filter((p) => p.id !== form.id)
            .map((p) => {
              const checked = form.recommendedFamilyIds.includes(p.id);
              return (
                <label key={p.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.recommendedFamilyIds, p.id]
                        : form.recommendedFamilyIds.filter((id) => id !== p.id);
                      patchForm({ recommendedFamilyIds: next });
                    }}
                  />
                  <span>
                    {p.name}
                    <span className="text-[#7a736c]"> · {p.category}</span>
                  </span>
                </label>
              );
            })}
          {!allProducts.length && (
            <p className="text-sm text-[#7a736c]">Save more products first to recommend them.</p>
          )}
        </div>
      </section>

      {/* Shipping */}
      <section className="overflow-hidden rounded-[1.5rem] border border-[#2d2b2b]/10 bg-white">
        <div className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] px-6 py-5">
          <p className="font-label text-[10px] tracking-[0.2em] text-[#7a736c]">SHIPPING</p>
          <p className="mt-2 text-sm font-light text-[#5a534c]">
            Prefills India-only delivery (5–7 working days). Edit freely if needed.
          </p>
        </div>
        <div className="space-y-5 px-6 py-6">
          <label className="block">
            <span className="text-xs text-[#7a736c]">Intro</span>
            <textarea
              className="input mt-1 min-h-20 rounded-2xl"
              value={form.shipping.intro}
              onChange={(e) =>
                patchForm({ shipping: { ...form.shipping, intro: e.target.value } })
              }
            />
          </label>
          <div className="overflow-hidden rounded-xl border border-[#2d2b2b]/10">
            <div className="grid grid-cols-2 border-b border-[#2d2b2b]/10 bg-[#faf7f2] px-4 py-3 text-xs font-medium text-[#2d2b2b]">
              <span>Location</span>
              <span>Estimated shipping time</span>
            </div>
            {(form.shipping.regions || []).map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-3 border-b border-[#2d2b2b]/8 px-4 py-3 last:border-b-0"
              >
                <input
                  className="input"
                  value={row.location}
                  onChange={(e) => {
                    const regions = [...form.shipping.regions];
                    regions[i] = { ...regions[i], location: e.target.value };
                    patchForm({ shipping: { ...form.shipping, regions } });
                  }}
                />
                <input
                  className="input"
                  value={row.eta}
                  onChange={(e) => {
                    const regions = [...form.shipping.regions];
                    regions[i] = { ...regions[i], eta: e.target.value };
                    patchForm({ shipping: { ...form.shipping, regions } });
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs italic text-[#7a736c]">
            Default: India · 5–7 working days (crafting/dispatch may add time).
          </p>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Shipping & delivery note</span>
            <textarea
              className="input mt-1 min-h-20 rounded-2xl"
              value={form.shipping.note}
              onChange={(e) =>
                patchForm({ shipping: { ...form.shipping, note: e.target.value } })
              }
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Delayed or lost shipments</span>
            <textarea
              className="input mt-1 min-h-20 rounded-2xl"
              value={form.shipping.delayed}
              onChange={(e) =>
                patchForm({ shipping: { ...form.shipping, delayed: e.target.value } })
              }
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || mediaBusy || leaveSaving}
          className="btn-primary inline-flex items-center gap-2"
        >
          {(saving || leaveSaving) && (
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
          )}
          {saving || leaveSaving
            ? 'Saving product…'
            : mediaBusy
              ? 'Wait for upload…'
              : 'Save product'}
        </button>
        {isDirty && !saving && !leaveSaving ? (
          <span className="text-xs text-[#5e062a]">Unsaved changes</span>
        ) : !isDirty && !saving ? (
          <span className="text-xs text-[#7a736c]">All changes saved</span>
        ) : null}
        {saving && (
          <span className="text-xs text-[#7a736c]">Product is being saved — please wait.</span>
        )}
      </div>

      {leaveOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2d2b2b]/45 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="unsaved-title" className="font-display text-2xl text-[#2d2b2b]">
              Save your changes?
            </h2>
            <p className="mt-2 text-sm text-[#7a736c]">
              You have unsaved edits on this product. Save them before leaving, or discard and
              continue.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2"
                disabled={leaveSaving || mediaBusy || saving}
                onClick={saveAndLeave}
              >
                {leaveSaving ? (
                  <span
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                ) : null}
                {leaveSaving ? 'Saving…' : 'Save & leave'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={leaveSaving}
                onClick={discardAndLeave}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={leaveSaving}
                onClick={stayOnPage}
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

import { createAdminSupabase } from '@/lib/supabase';

export const GIFT_OPTIONS_KEY = 'gift_options';

export const DEFAULT_GIFT_OPTIONS = {
  giftWrapEnabled: true,
  giftWrapFee: 25,
  giftWrapLabel: 'Gift wrap?',
  giftWrapDescription:
    'Ribbon-tied packaging — a soft finishing touch for someone special.',
  messageEnabled: true,
  messageLabel: 'Add a custom message?',
  messageDescription: 'We will include a short note with your order.',
  messageMaxLength: 200,
  messagePlaceholder: 'Write a short note…',
};

export function normalizeGiftOptions(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const fee = Math.max(0, Math.round(Number(src.giftWrapFee)));
  const maxLen = Math.min(
    500,
    Math.max(20, Math.round(Number(src.messageMaxLength) || 200)),
  );
  return {
    giftWrapEnabled: src.giftWrapEnabled !== false,
    giftWrapFee: Number.isFinite(fee) ? fee : DEFAULT_GIFT_OPTIONS.giftWrapFee,
    giftWrapLabel:
      String(src.giftWrapLabel || DEFAULT_GIFT_OPTIONS.giftWrapLabel).trim() ||
      DEFAULT_GIFT_OPTIONS.giftWrapLabel,
    giftWrapDescription: String(
      src.giftWrapDescription ?? DEFAULT_GIFT_OPTIONS.giftWrapDescription,
    ).trim(),
    messageEnabled: src.messageEnabled !== false,
    messageLabel:
      String(src.messageLabel || DEFAULT_GIFT_OPTIONS.messageLabel).trim() ||
      DEFAULT_GIFT_OPTIONS.messageLabel,
    messageDescription: String(
      src.messageDescription ?? DEFAULT_GIFT_OPTIONS.messageDescription,
    ).trim(),
    messageMaxLength: maxLen,
    messagePlaceholder:
      String(src.messagePlaceholder || DEFAULT_GIFT_OPTIONS.messagePlaceholder).trim() ||
      DEFAULT_GIFT_OPTIONS.messagePlaceholder,
  };
}

export async function loadGiftOptions() {
  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from('store_settings')
      .select('value')
      .eq('key', GIFT_OPTIONS_KEY)
      .maybeSingle();
    if (error) throw error;
    if (!data?.value) return { ...DEFAULT_GIFT_OPTIONS };
    return normalizeGiftOptions(data.value);
  } catch (err) {
    err.fallback = true;
    throw err;
  }
}

export async function saveGiftOptions(input) {
  const value = normalizeGiftOptions(input);
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('store_settings')
    .upsert(
      {
        key: GIFT_OPTIONS_KEY,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    .select('value')
    .single();
  if (error) throw error;
  return normalizeGiftOptions(data?.value || value);
}

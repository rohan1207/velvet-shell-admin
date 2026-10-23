export const DEFAULT_SHIPPING = {
  intro:
    'Orders are prepared Monday to Friday (excluding public holidays). Orders placed on Friday usually ship the following Monday.',
  regions: [{ location: 'India', eta: '5–7 working days' }],
  note: 'We currently deliver within India only. Estimated times start after dispatch and may vary during peak periods or courier delays.',
  delayed:
    'If tracking has not updated for several days, the parcel is not always lost. Contact us with your order number and we will investigate with the courier. Where needed, we arrange a replacement or refund.',
  returnsNote: 'See our Returns, Refunds & Exchanges policy for damaged or incorrect items.',
};

export function normalizeShipping(input) {
  const base = { ...DEFAULT_SHIPPING, ...(input || {}) };
  const regions =
    Array.isArray(base.regions) && base.regions.length
      ? base.regions
      : DEFAULT_SHIPPING.regions;
  return {
    intro: String(base.intro || DEFAULT_SHIPPING.intro),
    regions: regions.map((r) => ({
      location: String(r.location || 'India'),
      eta: String(r.eta || '5–7 working days'),
    })),
    note: String(base.note || DEFAULT_SHIPPING.note),
    delayed: String(base.delayed || DEFAULT_SHIPPING.delayed),
    returnsNote: String(base.returnsNote || DEFAULT_SHIPPING.returnsNote),
  };
}

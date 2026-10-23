/** Browser-safe helpers (no Supabase imports). */
export function randomCode(prefix = 'VS') {
  const chunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${chunk}`;
}

export function moneyINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export function statusTone(status) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-800';
  if (status === 'paused') return 'bg-amber-50 text-amber-800';
  if (status === 'expired') return 'bg-[#f0e8e2] text-[#7a736c]';
  return 'bg-[#faf7f2] text-[#7a736c]';
}

/**
 * Windows antivirus / corporate proxies often break Node's TLS trust store
 * (UNABLE_TO_VERIFY_LEAF_SIGNATURE). Allow an explicit local opt-out.
 */
export function allowInsecureTlsIfConfigured() {
  const enabled =
    process.env.SUPABASE_INSECURE_TLS === '1' ||
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

  if (enabled && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
}

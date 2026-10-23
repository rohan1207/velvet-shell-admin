import { createClient } from '@supabase/supabase-js';
import { allowInsecureTlsIfConfigured } from './tls';

allowInsecureTlsIfConfigured();

function clientOptions() {
  return {
    auth: { autoRefreshToken: false, persistSession: false },
  };
}

export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !serviceKey) {
    throw new Error('Supabase admin env is not configured.');
  }
  return createClient(url, serviceKey, clientOptions());
}

export function createAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';
  if (!url || !anonKey) {
    throw new Error('Supabase public env is not configured.');
  }
  return createClient(url, anonKey, clientOptions());
}

/**
 * One-shot: families with 2+ colour rows get has_color_variants=true,
 * and inactive siblings are left as-is (admin can re-enable).
 *
 *   node admin/scripts/repair-color-variant-flags.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const admin = resolve(root, 'admin');

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = {
  ...loadEnv(resolve(root, '.env.local')),
  ...loadEnv(resolve(admin, '.env.local')),
};
const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Missing Supabase env');
  process.exit(1);
}

async function sb(path, init) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: init?.method === 'PATCH' ? 'return=minimal' : 'count=exact',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const families = await sb(
  'product_families?select=id,slug,name,has_color_variants&order=updated_at.desc',
);
const variants = await sb(
  'product_color_variants?select=id,family_id,color_label,active',
);

const by = new Map();
for (const v of variants || []) {
  const list = by.get(v.family_id) || [];
  list.push(v);
  by.set(v.family_id, list);
}

let fixed = 0;
for (const f of families || []) {
  const list = by.get(f.id) || [];
  if (list.length < 2) continue;
  if (f.has_color_variants) continue;
  await sb(`product_families?id=eq.${f.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ has_color_variants: true }),
  });
  fixed += 1;
  console.log(`fixed flag: ${f.slug} (${list.length} colours)`);
}

console.log(`Done. Updated ${fixed} families.`);

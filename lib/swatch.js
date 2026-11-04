/**
 * Colour swatches: single `#RRGGBB` or two-tone `#RRGGBB/#RRGGBB`
 * (also accepts comma / pipe separators).
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function expandHex(hex) {
  const h = String(hex || '').trim();
  if (!HEX.test(h)) return null;
  if (h.length === 4) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toUpperCase();
  }
  return h.toUpperCase();
}

/** @returns {{ primary: string, secondary: string|null }} */
export function parseSwatch(value) {
  const raw = String(value || '').trim();
  if (!raw) return { primary: '#C5C5C5', secondary: null };

  const parts = raw
    .split(/[/|,]+/)
    .map((p) => expandHex(p.trim()))
    .filter(Boolean);

  if (!parts.length) {
    if (HEX.test(raw.startsWith('#') ? raw : `#${raw}`)) {
      return { primary: expandHex(raw.startsWith('#') ? raw : `#${raw}`), secondary: null };
    }
    return { primary: '#C5C5C5', secondary: null };
  }

  return {
    primary: parts[0],
    secondary: parts[1] && parts[1] !== parts[0] ? parts[1] : null,
  };
}

export function serializeSwatch(primary, secondary = null) {
  const a = expandHex(primary) || '#C5C5C5';
  const b = expandHex(secondary);
  if (!b || b === a) return a;
  return `${a}/${b}`;
}

/** CSS style object for swatch circles (solid or diagonal two-tone). */
export function swatchStyle(value) {
  const { primary, secondary } = parseSwatch(value);
  if (!secondary) return { backgroundColor: primary };
  return {
    backgroundImage: `linear-gradient(135deg, ${primary} 49.5%, ${secondary} 50.5%)`,
  };
}

export function isTwoToneSwatch(value) {
  return Boolean(parseSwatch(value).secondary);
}

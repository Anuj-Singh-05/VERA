// Formatting and escaping. Everything that reaches innerHTML goes through esc().

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

/** Fraction (0..1) to "87.5%". null -> em dash. */
export const pct = (v, digits = 1) => (v == null || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(digits)}%`);

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
/** Indian digit grouping: 300000 -> "3,00,000". */
export const amount = (n) => (n == null || Number.isNaN(+n) ? '—' : inr.format(+n));

export const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

/** ISO timestamp -> "10 Nov 2026, 19:31 UTC". */
export function when(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

export const elapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
};

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const word = (n) => WORDS[n] || String(n);

/**
 * Parses "limit=500000.0, recommended=594000.0" into pairs for display.
 * Returns null when the text is not a simple key=value list; the raw text is always shown too.
 */
export function parsePairs(text) {
  if (!text || typeof text !== 'string') return null;
  const parts = text.split(/,\s*(?=[A-Za-z_][\w ]*=)/);
  const out = [];
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i <= 0) return null;
    out.push([p.slice(0, i).trim(), p.slice(i + 1).trim()]);
  }
  return out.length ? out : null;
}

/** "594000.0" -> "5,94,000" when the whole value is a number; otherwise unchanged. */
export const prettyValue = (v) => (/^-?\d+(\.\d+)?$/.test(v) ? amount(parseFloat(v)) : v);

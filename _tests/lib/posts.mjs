// Helpers for the rule that every post exists in en / yu / sr and its versions
// agree (_tests/translations.test.cjs). No dependencies.

export const LANGS = ['en', 'yu', 'sr'];
export const FOLDERS = { en: '_posts/en', yu: '_posts/yu', sr: '_posts/sr' };

// A machine translation names its model in `ai_translated:` until the author
// proofreads it; post.html shows that as a notice. The tags these versions
// once carried instead must not come back.
const OLD_AI_TAG = /^(AI translated|Prevedeno pomoću VI|Преведено помоћу ВИ) \(.+\)$/;
export const isOldAiTag = (tag) => OLD_AI_TAG.test(tag);

// ------------------------------------------------------------------ front matter
// Only the keys these posts use are parsed; every other line is kept verbatim.

function parseList(text) {
  const items = [];
  const re = /\s*("(?:[^"\\]|\\.)*"|[^,]+)\s*(?:,|$)/gy;
  let m;
  while ((m = re.exec(text)) && m[0] !== '') {
    const raw = m[1].trim();
    items.push(raw.startsWith('"') ? JSON.parse(raw) : raw);
  }
  return items;
}

function unquote(value) {
  const v = value.trim();
  if (v.startsWith('"')) return JSON.parse(v);
  if (v.startsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

export function parsePost(text) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (!m) throw new Error('no front matter');
  const lines = m[1].split('\n');
  const get = (key) => lines.find((l) => l.startsWith(`${key}:`))?.slice(key.length + 1);
  const tags = get('tags');
  return {
    lines,
    title: get('title') !== undefined ? unquote(get('title')) : '',
    author: get('author') !== undefined ? unquote(get('author')) : '',
    tags: tags ? parseList(tags.trim().replace(/^\[|\]$/g, '')) : [],
    ref: get('ref')?.trim() || null,
    aiTranslated: get('ai_translated') !== undefined ? unquote(get('ai_translated')) || null : null,
    body: m[2],
  };
}

// ------------------------------------------------------------------ checks

const C2L = Object.fromEntries([...'абвгдђежзијклљмнњопрстћуфхцчџш'].map((c, i) =>
  [c, ['a', 'b', 'v', 'g', 'd', 'đ', 'e', 'ž', 'z', 'i', 'j', 'k', 'l', 'lj', 'm', 'n', 'nj', 'o', 'p', 'r', 's', 't', 'ć', 'u', 'f', 'h', 'c', 'č', 'dž', 'š'][i]]));

// Cyrillic to Latin; Latin characters pass through, so a Cyrillic text with
// foreign names in Latin maps back to its Latin twin exactly.
export function cyrToLat(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const lo = ch.toLowerCase();
    const lat = C2L[lo];
    if (!lat) { out += ch; continue; }
    if (ch === lo) { out += lat; continue; }
    const next = text[i + 1] || '';
    const allCaps = /\p{Lu}/u.test(next);
    out += allCaps ? lat.toUpperCase() : lat[0].toUpperCase() + lat.slice(1);
  }
  return out;
}

const withoutFences = (body) => body.replace(/```[\s\S]*?```/g, '');
export const codeOf = (body) => [
  ...(body.match(/```[\s\S]*?```/g) || []),
  ...(withoutFences(body).match(/(?<!`)`[^`\n]+`(?!`)/g) || []),
];
export const urlsOf = (body) => [
  ...[...body.matchAll(/\]\(([^)\s]+(?:\([^)]*\)[^)\s]*)?)\)/g)].map((m) => m[1]),
  ...[...body.matchAll(/href="([^"]+)"/g)].map((m) => m[1]),
];
export const shapeOf = (body) => [
  ...body.split('\n').filter((l) => /^#+ |^\[\^\w+\]:/.test(l)).map((l) => l.split(' ')[0]),
  String((body.match(/\[\^\w+\](?!:)/g) || []).length),
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Problems with one post's versions, judged against `source`: code, URLs,
// headings and footnotes copied, refs equal, no AI tag, sr = yu in Cyrillic.
export function checkPost(versions, source) {
  const problems = [];
  const src = versions[source];
  for (const lang of LANGS) {
    const v = versions[lang];
    if (!v) { problems.push(`${lang}: missing`); continue; }
    if (v.ref !== src.ref || !v.ref) problems.push(`${lang}: ref ${v.ref} differs from ${source}'s ${src.ref}`);
    if (v.tags.some(isOldAiTag)) problems.push(`${lang}: AI translation is marked by ai_translated:, not a tag`);
    if (lang === source) continue;
    if (!same(codeOf(v.body), codeOf(src.body))) problems.push(`${lang}: code differs from ${source}`);
    if (!same(urlsOf(v.body), urlsOf(src.body))) problems.push(`${lang}: links differ from ${source}`);
    if (!same(shapeOf(v.body), shapeOf(src.body))) problems.push(`${lang}: headings or footnotes differ from ${source}`);
  }
  if (versions.yu && versions.sr) {
    const yu = versions.yu.body.split(/\s+/);
    const sr = cyrToLat(versions.sr.body).split(/\s+/);
    const at = yu.findIndex((w, i) => w !== sr[i]);
    if (at !== -1 || yu.length !== sr.length) {
      const i = at === -1 ? Math.min(yu.length, sr.length) : at;
      problems.push(`sr is not yu in Cyrillic from word ${i}: yu "${yu.slice(i, i + 6).join(' ')}" vs sr "${sr.slice(i, i + 6).join(' ')}"`);
    }
  }
  return problems;
}

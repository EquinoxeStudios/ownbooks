export type ImportKind = 'audio' | 'ebook';

/** Why a picked file can't be imported; maps to i18n keys under import.errors. */
export type RejectReason = 'drm' | 'unsupported';

const AUDIO_EXT = new Set(['mp3', 'm4b', 'm4a']);
const EBOOK_EXT = new Set(['epub']);
/** Formats we can recognise but never play because they are DRM-protected. */
const DRM_EXT = new Set(['aax', 'aa', 'aaxc', 'm4p', 'azw', 'azw3', 'kfx', 'acsm']);

/** MIME types offered to the system picker. Kept broad: providers label files inconsistently. */
export const AUDIO_PICKER_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4b', 'audio/x-m4a', 'audio/*'];
export const EBOOK_PICKER_TYPES = ['application/epub+zip'];

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function classify(name: string): { kind: ImportKind } | { reject: RejectReason } {
  const ext = extensionOf(name);
  if (AUDIO_EXT.has(ext)) return { kind: 'audio' };
  if (EBOOK_EXT.has(ext)) return { kind: 'ebook' };
  if (DRM_EXT.has(ext)) return { reject: 'drm' };
  return { reject: 'unsupported' };
}

/** "02 - Chapter Two.mp3" → "02 - Chapter Two"; "moby_dick.m4b" → "moby dick". */
export function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  const cleaned = base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || name;
}

/**
 * Best-effort title for a multi-file audiobook from its file names: the
 * longest common prefix, minus trailing track numbers and separators.
 */
export function titleFromFilenames(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return titleFromFilename(names[0]);
  const titles = names.map(titleFromFilename);
  let prefix = titles[0];
  for (const t of titles.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < t.length && prefix[i].toLowerCase() === t[i].toLowerCase()) i++;
    prefix = prefix.slice(0, i);
  }
  const trimmed = prefix.replace(/[\s\-–—_.,:(]*(part|track|chapter|cd|disc)?[\s\-–—_.,:(]*\d*$/i, '').trim();
  return trimmed.length >= 2 ? trimmed : stripTrackNumber(titles[0]);
}

/**
 * Removes leading track numbering: "01-y" → "y", "03. Foo" → "Foo",
 * "Track 2 - Bar" → "Bar", "01 Baz" → "Baz". Bare numbers ("1984") and
 * numbers without a leading zero before a space ("101 Dalmatians") are kept.
 */
export function stripTrackNumber(title: string): string {
  const rest = title.replace(/^\s*(?:(?:track|part|chapter|cd|disc)\s*)?(?:\d{1,4}\s*[-–—_.):\]]+|0\d{0,3}\s+)\s*/i, '');
  return rest.trim() ? rest.trim() : title;
}

/** A track's display title when its file has no title tag. */
export function trackTitleFromFilename(name: string): string {
  return stripTrackNumber(titleFromFilename(name));
}

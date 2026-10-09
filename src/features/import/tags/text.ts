/**
 * Text decoders for tag strings. Written by hand because Hermes' TextDecoder
 * only handles UTF-8, and ID3 also uses Latin-1 and UTF-16.
 */

export function decodeLatin1(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

export function decodeUtf8(b: Uint8Array): string {
  let s = '';
  let i = 0;
  // Skip a byte-order mark.
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) i = 3;
  while (i < b.length) {
    const c = b[i++];
    let cp: number;
    if (c < 0x80) {
      cp = c;
    } else if (c >= 0xc0 && c < 0xe0 && i < b.length) {
      cp = ((c & 0x1f) << 6) | (b[i++] & 0x3f);
    } else if (c >= 0xe0 && c < 0xf0 && i + 1 < b.length) {
      cp = ((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
    } else if (c >= 0xf0 && c < 0xf8 && i + 2 < b.length) {
      cp = ((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
    } else {
      cp = 0xfffd;
    }
    s += String.fromCodePoint(cp);
  }
  return s;
}

/** UTF-16 with an optional BOM; `bigEndian` is the default when there is none. */
export function decodeUtf16(b: Uint8Array, bigEndian: boolean): string {
  let i = 0;
  let be = bigEndian;
  if (b[0] === 0xff && b[1] === 0xfe) {
    be = false;
    i = 2;
  } else if (b[0] === 0xfe && b[1] === 0xff) {
    be = true;
    i = 2;
  }
  let s = '';
  for (; i + 1 < b.length; i += 2) s += String.fromCharCode(be ? (b[i] << 8) | b[i + 1] : b[i] | (b[i + 1] << 8));
  return s;
}

/** Trims whitespace and stray NULs; returns undefined for empty strings. */
export function clean(s: string | undefined): string | undefined {
  if (s === undefined) return undefined;
  const t = s.replace(/\u0000+$/g, '').replace(/^﻿/, '').trim();
  return t || undefined;
}

/** "3/40" → 3; "" or garbage → undefined. */
export function parseIndex(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

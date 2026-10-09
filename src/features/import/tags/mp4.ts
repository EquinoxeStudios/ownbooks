import { ascii, readExactly, u16, u32, u64, type ByteSource } from './source';
import { clean, decodeUtf16, decodeUtf8 } from './text';
import {
  imageMime,
  MAX_CHAPTERS,
  MAX_COVER_BYTES,
  type AudioTags,
  type ReadOptions,
  type TagChapter,
} from './types';

/**
 * MP4 (M4B/M4A) reader. Walks box headers only and reads just the metadata
 * boxes: iTunes `ilst` tags, Nero `chpl` chapters, and the QuickTime chapter
 * text track. The audio sample tables (which can be megabytes) are never read.
 */

type Box = { type: string; start: number; end: number; size: number };

/** Small boxes we read whole; anything bigger is skipped as implausible. */
const MAX_SMALL_BOX = 4 * 1024 * 1024;

const ILST_TEXT: Record<string, keyof AudioTags> = {
  '©nam': 'title',
  '©alb': 'album',
  '©ART': 'artist',
  aART: 'albumArtist',
  '©wrt': 'composer',
};

function* children(source: ByteSource, start: number, end: number): Generator<Box> {
  let pos = start;
  while (pos + 8 <= end) {
    const h = readExactly(source, pos, Math.min(16, end - pos));
    let size = u32(h, 0);
    const type = ascii(h, 4, 8);
    let headerSize = 8;
    if (size === 1) {
      if (h.length < 16) return;
      size = u64(h, 8);
      headerSize = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < headerSize || pos + size > end) return;
    yield { type, start: pos + headerSize, end: pos + size, size: size - headerSize };
    pos += size;
  }
}

function find(source: ByteSource, parent: Box, type: string): Box | undefined {
  for (const b of children(source, parent.start, parent.end)) if (b.type === type) return b;
  return undefined;
}

function contents(source: ByteSource, box: Box): Uint8Array {
  if (box.size > MAX_SMALL_BOX) throw new RangeError(`${box.type} box too large`);
  return readExactly(source, box.start, box.size);
}

export function readMp4(source: ByteSource, opts: ReadOptions = {}): AudioTags {
  const tags: AudioTags = {};
  const root: Box = { type: '', start: 0, end: source.size, size: source.size };
  const moov = find(source, root, 'moov');
  if (!moov) return tags;

  const traks: Box[] = [];
  let udta: Box | undefined;
  for (const b of children(source, moov.start, moov.end)) {
    if (b.type === 'trak') traks.push(b);
    else if (b.type === 'udta') udta = b;
  }

  let chapters: TagChapter[] | undefined;
  if (udta) {
    const meta = find(source, udta, 'meta');
    if (meta) readIlst(source, meta, tags, opts);
    const chpl = find(source, udta, 'chpl');
    if (chpl) chapters = readChpl(contents(source, chpl));
  }
  if (!chapters?.length) chapters = readChapterTrack(source, traks);
  if (chapters?.length) tags.chapters = chapters;
  return tags;
}

function readIlst(source: ByteSource, meta: Box, tags: AudioTags, opts: ReadOptions): void {
  // `meta` is a full box (4 bytes of version/flags) in MP4, but not in QuickTime files.
  const peek = readExactly(source, meta.start, Math.min(8, meta.size));
  const start = ascii(peek, 4, 8) === 'hdlr' ? meta.start : meta.start + 4;
  const ilst = find(source, { ...meta, start }, 'ilst');
  if (!ilst) return;

  for (const item of children(source, ilst.start, ilst.end)) {
    const field = ILST_TEXT[item.type];
    const isCover = item.type === 'covr';
    if (!field && !isCover && item.type !== 'trkn' && item.type !== 'disk') continue;
    if (isCover && (opts.cover === false || tags.cover || item.size > MAX_COVER_BYTES + 1024)) continue;
    if (!isCover && item.size > 64 * 1024) continue;

    const data = find(source, item, 'data');
    if (!data || data.size < 8) continue;
    const b = readExactly(source, data.start, data.size);
    const kind = u32(b, 0) & 0xffffff;
    const value = b.subarray(8);

    if (field) {
      const text = clean(kind === 2 ? decodeUtf16(value, true) : decodeUtf8(value));
      if (text && !tags[field]) (tags[field] as string) = text;
    } else if (isCover) {
      const mime = imageMime(value);
      if (mime) tags.cover = { mime, bytes: value.slice() };
    } else if (value.length >= 4) {
      // trkn/disk: 2 reserved bytes, then the number and the total.
      const n = u16(value, 2);
      if (n > 0) tags[item.type === 'trkn' ? 'track' : 'disc'] = n;
    }
  }
}

/** Nero chapters: start times in 100 ns units, Pascal-string titles. */
function readChpl(b: Uint8Array): TagChapter[] {
  const version = b[0];
  let pos = version === 0 ? 4 : 8;
  const count = b[pos++];
  const out: TagChapter[] = [];
  for (let i = 0; i < count && pos + 9 <= b.length; i++) {
    const start = u64(b, pos);
    const len = b[pos + 8];
    pos += 9;
    const title = clean(decodeUtf8(b.subarray(pos, pos + len))) ?? null;
    pos += len;
    out.push({ title, startMs: Math.round(start / 10_000) });
  }
  return out;
}

/** QuickTime chapters: a text track referenced from the audio track's `tref/chap`. */
function readChapterTrack(source: ByteSource, traks: Box[]): TagChapter[] | undefined {
  const ids = new Map<number, Box>();
  const refs: number[] = [];
  for (const trak of traks) {
    const tkhd = find(source, trak, 'tkhd');
    if (!tkhd) continue;
    const t = contents(source, tkhd);
    ids.set(u32(t, t[0] === 1 ? 20 : 12), trak);
    const tref = find(source, trak, 'tref');
    const chap = tref && find(source, tref, 'chap');
    if (chap) {
      const c = contents(source, chap);
      for (let o = 0; o + 4 <= c.length; o += 4) refs.push(u32(c, o));
    }
  }
  const trak = refs.map((id) => ids.get(id)).find(Boolean);
  if (!trak) return undefined;

  const mdia = find(source, trak, 'mdia');
  const mdhd = mdia && find(source, mdia, 'mdhd');
  const minf = mdia && find(source, mdia, 'minf');
  const stbl = minf && find(source, minf, 'stbl');
  if (!mdhd || !stbl) return undefined;
  const m = contents(source, mdhd);
  const timescale = u32(m, m[0] === 1 ? 20 : 12);
  if (!timescale) return undefined;

  const table = (type: string) => {
    const box = find(source, stbl, type);
    return box ? contents(source, box) : undefined;
  };
  const stts = table('stts');
  const stsz = table('stsz');
  const stsc = table('stsc');
  const stco = table('stco');
  const co64 = stco ? undefined : table('co64');
  if (!stts || !stsz || !stsc || !(stco || co64)) return undefined;

  // Sample start times.
  const starts: number[] = [];
  let t = 0;
  for (let i = 0, n = u32(stts, 4); i < n; i++) {
    const count = u32(stts, 8 + i * 8);
    const delta = u32(stts, 12 + i * 8);
    for (let j = 0; j < count && starts.length < MAX_CHAPTERS; j++, t += delta) starts.push(t);
  }

  // Sample sizes.
  const fixed = u32(stsz, 4);
  const sampleCount = Math.min(u32(stsz, 8), MAX_CHAPTERS);
  const sizeOf = (i: number) => (fixed ? fixed : u32(stsz, 12 + i * 4));

  // Chunk offsets, then samples laid out chunk by chunk per stsc.
  const chunkCount = u32((stco ?? co64)!, 4);
  const chunkOffset = (i: number) => (stco ? u32(stco, 8 + i * 4) : u64(co64!, 8 + i * 8));
  const runs = u32(stsc, 4);
  const offsets: number[] = [];
  for (let r = 0; r < runs && offsets.length < sampleCount; r++) {
    const first = u32(stsc, 8 + r * 12) - 1;
    const perChunk = u32(stsc, 12 + r * 12);
    const last = r + 1 < runs ? u32(stsc, 8 + (r + 1) * 12) - 1 : chunkCount;
    for (let c = first; c < last && offsets.length < sampleCount; c++) {
      let off = chunkOffset(c);
      for (let s = 0; s < perChunk && offsets.length < sampleCount; s++) {
        offsets.push(off);
        off += sizeOf(offsets.length - 1);
      }
    }
  }

  const out: TagChapter[] = [];
  for (let i = 0; i < Math.min(offsets.length, starts.length); i++) {
    const size = sizeOf(i);
    let title: string | null = null;
    if (size >= 2 && size <= 4096 && offsets[i] + size <= source.size) {
      const s = readExactly(source, offsets[i], size);
      const len = Math.min(u16(s, 0), size - 2);
      const text = s.subarray(2, 2 + len);
      title = clean(text[0] === 0xfe && text[1] === 0xff ? decodeUtf16(text, true) : decodeUtf8(text)) ?? null;
    }
    out.push({ title, startMs: Math.round((starts[i] / timescale) * 1000) });
  }
  return out;
}

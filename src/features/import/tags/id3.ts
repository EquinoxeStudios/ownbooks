import { ascii, bytesSource, readExactly, u32, type ByteSource } from './source';
import { clean, decodeLatin1, decodeUtf16, decodeUtf8, parseIndex } from './text';
import {
  imageMime,
  MAX_CHAPTERS,
  MAX_COVER_BYTES,
  MAX_TAG_BYTES,
  type AudioTags,
  type CoverImage,
  type ReadOptions,
  type TagChapter,
} from './types';

/**
 * ID3v2.2/2.3/2.4 reader (plus an ID3v1 fallback) for the fields OwnBooks uses.
 * Frames are read one at a time, so cover images we don't need are never loaded.
 * Spec: https://id3.org/id3v2.4.0-structure and id3v2.3.0.
 */

const TEXT_FRAMES: Record<string, keyof AudioTags> = {
  TIT2: 'title',
  TT2: 'title',
  TALB: 'album',
  TAL: 'album',
  TPE1: 'artist',
  TP1: 'artist',
  TPE2: 'albumArtist',
  TP2: 'albumArtist',
  TCOM: 'composer',
  TCM: 'composer',
  TRCK: 'track',
  TRK: 'track',
  TPOS: 'disc',
  TPA: 'disc',
};

const FRONT_COVER = 3;

type Frame = { id: string; data: Uint8Array };

export function readId3(source: ByteSource, opts: ReadOptions = {}): AudioTags {
  const tags: AudioTags = {};
  if (source.size >= 10) {
    const header = readExactly(source, 0, 10);
    if (ascii(header, 0, 3) === 'ID3') readId3v2(source, header, tags, opts);
  }
  if (!tags.title || !tags.artist || !tags.album) readId3v1(source, tags);
  return tags;
}

function syncsafe(b: Uint8Array, o: number): number {
  return ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);
}

/** Reverses "unsynchronisation": every 0xFF 0x00 pair becomes 0xFF. */
function deunsync(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    out[n++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0x00) i++;
  }
  return out.subarray(0, n);
}

function readId3v2(file: ByteSource, header: Uint8Array, tags: AudioTags, opts: ReadOptions): void {
  const version = header[3];
  const flags = header[5];
  const size = syncsafe(header, 6);
  if (version < 2 || version > 4 || size > MAX_TAG_BYTES || 10 + size > file.size) return;
  // ID3v2.2 compression was never defined; such tags can't be read.
  if (version === 2 && flags & 0x40) return;

  // Tag-wide unsynchronisation (mostly v2.3): undo it on the whole tag first.
  let source = file;
  let start = 10;
  let end = 10 + size;
  if (flags & 0x80 && version < 4) {
    source = bytesSource(deunsync(readExactly(file, 10, size)));
    start = 0;
    end = source.size;
  }
  if (version >= 3 && flags & 0x40) {
    const ext = readExactly(source, start, 4);
    // v2.4 counts the size field itself and stores it syncsafe; v2.3 doesn't.
    start += version === 4 ? syncsafe(ext, 0) : u32(ext, 0) + 4;
  }

  let cover: { image: CoverImage; front: boolean } | undefined;
  const chapters: TagChapter[] = [];

  for (const frame of frames(source, start, end, version, (id, frameSize) => wants(id, frameSize, opts))) {
    const field = TEXT_FRAMES[frame.id];
    if (field) {
      const value = clean(firstValue(decodeText(frame.data)));
      if (field === 'track' || field === 'disc') tags[field] = parseIndex(value);
      else if (value && !tags[field]) (tags[field] as string) = value;
    } else if (frame.id === 'APIC' || frame.id === 'PIC') {
      if (cover?.front) continue;
      const pic = parsePicture(frame, version);
      if (pic) cover = pic;
    } else if (frame.id === 'CHAP' && chapters.length < MAX_CHAPTERS) {
      const ch = parseChapter(frame.data, version);
      if (ch) chapters.push(ch);
    }
  }

  if (cover) tags.cover = cover.image;
  if (chapters.length > 0) tags.chapters = chapters.sort((a, b) => a.startMs - b.startMs);
}

function wants(id: string, size: number, opts: ReadOptions): boolean {
  if (TEXT_FRAMES[id] || id === 'CHAP') return size <= 1024 * 1024;
  if (id === 'APIC' || id === 'PIC') return opts.cover !== false && size <= MAX_COVER_BYTES + 1024;
  return false;
}

/** Iterates frames, reading only the payloads `want` asks for. */
function* frames(
  source: ByteSource,
  start: number,
  end: number,
  version: number,
  want: (id: string, size: number) => boolean,
): Generator<Frame> {
  const headerSize = version === 2 ? 6 : 10;
  let pos = start;
  while (pos + headerSize <= end) {
    const h = readExactly(source, pos, headerSize);
    if (h[0] === 0) return; // padding
    const id = ascii(h, 0, version === 2 ? 3 : 4);
    if (!/^[A-Z0-9]+$/.test(id)) return;

    let size: number;
    if (version === 2) size = (h[3] << 16) | (h[4] << 8) | h[5];
    // v2.4 sizes are syncsafe, but some writers (old iTunes) store plain integers.
    else if (version === 4 && !(h[4] & 0x80 || h[5] & 0x80 || h[6] & 0x80 || h[7] & 0x80)) size = syncsafe(h, 4);
    else size = u32(h, 4);

    const dataStart = pos + headerSize;
    if (size === 0 || dataStart + size > end) return;
    pos = dataStart + size;
    if (!want(id, size)) continue;

    let data = readExactly(source, dataStart, size);
    if (version >= 3) {
      const format = h[9];
      if (version === 3) {
        if (format & 0xc0) continue; // compressed or encrypted
        if (format & 0x20) data = data.subarray(1); // grouping id
      } else {
        if (format & 0x0c) continue; // compressed or encrypted
        if (format & 0x40) data = data.subarray(1); // grouping id
        if (format & 0x01) data = data.subarray(4); // data length indicator
        if (format & 0x02) data = deunsync(data);
      }
    }
    yield { id, data };
  }
}

/** Decodes an encoded string: first byte is the encoding. */
function decodeText(data: Uint8Array): string {
  return decodeWith(data[0], data.subarray(1));
}

function decodeWith(encoding: number, b: Uint8Array): string {
  switch (encoding) {
    case 0:
      return decodeLatin1(b);
    case 1:
      return decodeUtf16(b, false);
    case 2:
      return decodeUtf16(b, true);
    default:
      return decodeUtf8(b);
  }
}

/** ID3v2.4 allows several NUL-separated values; we use the first. */
function firstValue(s: string): string {
  const nul = s.indexOf('\u0000');
  return nul < 0 ? s : s.slice(0, nul);
}

/** Index just past a NUL terminator (two bytes, aligned, for UTF-16). */
function skipTerminated(b: Uint8Array, from: number, encoding: number): number {
  const wide = encoding === 1 || encoding === 2;
  for (let i = from; i < b.length; i += wide ? 2 : 1) {
    if (b[i] === 0 && (!wide || b[i + 1] === 0)) return i + (wide ? 2 : 1);
  }
  return b.length;
}

function parsePicture(frame: Frame, version: number): { image: CoverImage; front: boolean } | null {
  const b = frame.data;
  const encoding = b[0];
  // APIC: MIME string; PIC (v2.2): three-letter format.
  let pos = version === 2 ? 4 : skipTerminated(b, 1, 0);
  const type = b[pos++];
  pos = skipTerminated(b, pos, encoding);
  const bytes = b.subarray(pos);
  const mime = imageMime(bytes);
  if (!mime || bytes.length > MAX_COVER_BYTES) return null;
  // Copy so the cover doesn't keep a larger tag buffer alive.
  return { image: { mime, bytes: bytes.slice() }, front: type === FRONT_COVER };
}

/** CHAP: element id, start/end ms, byte offsets, then embedded frames (TIT2). */
function parseChapter(b: Uint8Array, version: number): TagChapter | null {
  const idEnd = skipTerminated(b, 0, 0);
  if (idEnd + 16 > b.length) return null;
  const startMs = u32(b, idEnd);
  let title: string | null = null;
  const sub = bytesSource(b);
  for (const f of frames(sub, idEnd + 16, b.length, version, (id) => id === 'TIT2')) {
    title = clean(firstValue(decodeText(f.data))) ?? null;
  }
  return { title, startMs };
}

/** The 128-byte ID3v1 tag at the end of the file. */
function readId3v1(source: ByteSource, tags: AudioTags): void {
  if (source.size < 128) return;
  const b = readExactly(source, source.size - 128, 128);
  if (ascii(b, 0, 3) !== 'TAG') return;
  const field = (from: number, len: number) => clean(firstValue(decodeLatin1(b.subarray(from, from + len))));
  tags.title ??= field(3, 30);
  tags.artist ??= field(33, 30);
  tags.album ??= field(63, 30);
  // ID3v1.1: a zero byte before the last comment byte means that byte is the track.
  if (tags.track === undefined && b[125] === 0 && b[126] !== 0) tags.track = b[126];
}

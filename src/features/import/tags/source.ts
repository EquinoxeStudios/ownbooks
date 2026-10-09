/**
 * Random-access reads over a file. Parsers only ever read the small parts of a
 * file they need (tag headers, frames, boxes), never the audio itself.
 */
export interface ByteSource {
  readonly size: number;
  /** Returns up to `length` bytes at `offset` (fewer at the end of the file). */
  read(offset: number, length: number): Uint8Array;
}

export function bytesSource(bytes: Uint8Array): ByteSource {
  return {
    size: bytes.length,
    read: (offset, length) => bytes.subarray(offset, Math.min(bytes.length, offset + length)),
  };
}

/** Reads exactly `length` bytes or throws, so parsers can't run past the end silently. */
export function readExactly(source: ByteSource, offset: number, length: number): Uint8Array {
  if (offset < 0 || length < 0 || offset + length > source.size) throw new RangeError('read past end of file');
  const bytes = source.read(offset, length);
  if (bytes.length !== length) throw new RangeError('short read');
  return bytes;
}

export function u16(b: Uint8Array, o: number): number {
  return (b[o] << 8) | b[o + 1];
}

export function u32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

export function u64(b: Uint8Array, o: number): number {
  return u32(b, o) * 2 ** 32 + u32(b, o + 4);
}

export function ascii(b: Uint8Array, start: number, end: number): string {
  let s = '';
  for (let i = start; i < end; i++) s += String.fromCharCode(b[i]);
  return s;
}

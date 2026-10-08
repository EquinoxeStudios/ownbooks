/**
 * Book fingerprints identify the same file on two devices without uploading it
 * or hashing whole files (spec §4.7):
 *   file:       SHA-256( size as 8-byte big-endian ‖ first 1 MiB ‖ last 1 MiB )
 *   multi-file: SHA-256( UTF-8 of the ordered track fingerprints joined by "\n" )
 */
export const FINGERPRINT_CHUNK = 1024 * 1024;

export type Digest = (data: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>;

/** Byte ranges to read for a file of `size` bytes (head and tail may overlap for small files). */
export function fingerprintRanges(size: number): { head: [number, number]; tail: [number, number] } {
  const headLen = Math.min(size, FINGERPRINT_CHUNK);
  const tailStart = Math.max(0, size - FINGERPRINT_CHUNK);
  return { head: [0, headLen], tail: [tailStart, size - tailStart] };
}

export function fingerprintInput(size: number, head: Uint8Array, tail: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(8 + head.length + tail.length);
  // 8-byte big-endian size; files are < 2^53 bytes so two 32-bit halves suffice.
  const hi = Math.floor(size / 2 ** 32);
  const lo = size >>> 0;
  const view = new DataView(out.buffer);
  view.setUint32(0, hi);
  view.setUint32(4, lo);
  out.set(head, 8);
  out.set(tail, 8 + head.length);
  return out;
}

export function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function fileFingerprint(
  size: number,
  head: Uint8Array,
  tail: Uint8Array,
  digest: Digest,
): Promise<string> {
  return toHex(await digest(fingerprintInput(size, head, tail)));
}

export async function bookFingerprint(trackFingerprints: readonly string[], digest: Digest): Promise<string> {
  if (trackFingerprints.length === 1) return trackFingerprints[0];
  return toHex(await digest(new TextEncoder().encode(trackFingerprints.join('\n'))));
}

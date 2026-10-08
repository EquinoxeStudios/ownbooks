import { createHash } from 'node:crypto';

import {
  bookFingerprint,
  fileFingerprint,
  FINGERPRINT_CHUNK,
  fingerprintInput,
  fingerprintRanges,
} from '../fingerprint';
import { classify, titleFromFilename, titleFromFilenames } from '../formats';
import { groupPickedFiles } from '../grouping';

const sha256 = async (data: Uint8Array<ArrayBuffer>) => {
  const out = createHash('sha256').update(data).digest();
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
};

describe('classify', () => {
  it.each([
    ['book.MP3', { kind: 'audio' }],
    ['book.m4b', { kind: 'audio' }],
    ['book.m4a', { kind: 'audio' }],
    ['book.epub', { kind: 'ebook' }],
    ['book.aax', { reject: 'drm' }],
    ['book.azw3', { reject: 'drm' }],
    ['book.pdf', { reject: 'unsupported' }],
    ['noextension', { reject: 'unsupported' }],
  ])('%s', (name, expected) => {
    expect(classify(name)).toEqual(expected);
  });
});

describe('titles from filenames', () => {
  it('strips the extension and underscores', () => {
    expect(titleFromFilename('moby_dick.m4b')).toBe('moby dick');
  });

  it('finds the shared prefix of multi-file audiobooks', () => {
    expect(titleFromFilenames(['Frankenstein - 01.mp3', 'Frankenstein - 02.mp3', 'Frankenstein - 10.mp3'])).toBe(
      'Frankenstein',
    );
    expect(titleFromFilenames(['Walden Part 1.mp3', 'Walden Part 2.mp3'])).toBe('Walden');
  });

  it('falls back to the first title when nothing is shared', () => {
    expect(titleFromFilenames(['01.mp3', '02.mp3'])).toBe('01');
  });
});

describe('fingerprint', () => {
  it('reads head and tail ranges, overlapping for small files', () => {
    expect(fingerprintRanges(10)).toEqual({ head: [0, 10], tail: [0, 10] });
    const big = 5 * FINGERPRINT_CHUNK;
    expect(fingerprintRanges(big)).toEqual({
      head: [0, FINGERPRINT_CHUNK],
      tail: [4 * FINGERPRINT_CHUNK, FINGERPRINT_CHUNK],
    });
  });

  it('encodes the size as 8 bytes big-endian', () => {
    const input = fingerprintInput(2 ** 32 + 5, new Uint8Array([1]), new Uint8Array([2]));
    expect(Array.from(input)).toEqual([0, 0, 0, 1, 0, 0, 0, 5, 1, 2]);
  });

  it('is a 64-char hex SHA-256 that changes with content and size', async () => {
    const a = await fileFingerprint(3, new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]), sha256);
    const b = await fileFingerprint(3, new Uint8Array([1, 2, 4]), new Uint8Array([1, 2, 4]), sha256);
    const c = await fileFingerprint(4, new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]), sha256);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('hashes ordered track fingerprints for multi-file books', async () => {
    const one = await bookFingerprint(['a'.repeat(64)], sha256);
    expect(one).toBe('a'.repeat(64));
    const ab = await bookFingerprint(['a'.repeat(64), 'b'.repeat(64)], sha256);
    const ba = await bookFingerprint(['b'.repeat(64), 'a'.repeat(64)], sha256);
    expect(ab).toMatch(/^[0-9a-f]{64}$/);
    expect(ab).not.toBe(ba);
  });
});

describe('groupPickedFiles', () => {
  const f = (name: string) => ({ uri: `content://x/${name}`, name, size: 1 });

  it('joins loose MP3/M4A files into one book in natural order', () => {
    const { groups, rejected } = groupPickedFiles([f('Walden 10.mp3'), f('Walden 2.mp3'), f('Walden 1.m4a')]);
    expect(rejected).toEqual([]);
    expect(groups).toHaveLength(1);
    expect(groups[0].files.map((x) => x.name)).toEqual(['Walden 1.m4a', 'Walden 2.mp3', 'Walden 10.mp3']);
    expect(groups[0].suggestedTitle).toBe('Walden');
  });

  it('keeps each M4B and EPUB separate and reports rejects', () => {
    const { groups, rejected } = groupPickedFiles([
      f('a.m4b'),
      f('b.m4b'),
      f('c.epub'),
      f('d.aax'),
      f('e.pdf'),
    ]);
    expect(groups.map((g) => [g.kind, g.files.length])).toEqual([
      ['audio', 1],
      ['audio', 1],
      ['ebook', 1],
    ]);
    expect(rejected).toEqual([
      { name: 'd.aax', reason: 'drm' },
      { name: 'e.pdf', reason: 'unsupported' },
    ]);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readTags } from '..';
import { bytesSource, type ByteSource } from '../source';

// Fixtures are made by scripts/make-tag-fixtures.mjs (ffmpeg).
const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, 'fixtures', name)));

/** Counts bytes read, to prove parsers skip what they don't need. */
function counting(bytes: Uint8Array): ByteSource & { bytesRead: number } {
  const inner = bytesSource(bytes);
  const src = {
    size: inner.size,
    bytesRead: 0,
    read(offset: number, length: number) {
      const out = inner.read(offset, length);
      src.bytesRead += out.length;
      return out;
    },
  };
  return src;
}

describe('readTags: real files', () => {
  it('reads ID3v2.3 UTF-16 text, track/disc numbers and the front cover', () => {
    const tags = readTags(bytesSource(fixture('id3v23-cover.mp3')), 'mp3');
    expect(tags).toMatchObject({
      title: 'Chapter Three',
      album: 'Wuthering Heights',
      artist: 'Emily Brontë',
      albumArtist: 'Emily Brontë',
      composer: 'Narrator Name',
      track: 3,
      disc: 1,
    });
    expect(tags.cover?.mime).toBe('image/jpeg');
    expect(tags.cover?.bytes.length).toBeGreaterThan(100);
    expect(tags.chapters).toBeUndefined();
  });

  it('skips cover bytes when asked', () => {
    const bytes = fixture('id3v23-cover.mp3');
    const withCover = counting(bytes);
    const without = counting(bytes);
    readTags(withCover, 'mp3');
    const tags = readTags(without, 'mp3', { cover: false });
    expect(tags.cover).toBeUndefined();
    expect(tags.album).toBe('Wuthering Heights');
    expect(without.bytesRead).toBeLessThan(withCover.bytesRead - 100);
  });

  it('reads ID3v2.4 CHAP chapters in order with titles', () => {
    const tags = readTags(bytesSource(fixture('id3v24-chapters.mp3')), 'mp3');
    expect(tags).toMatchObject({ title: 'Chaptered Book', album: 'Chaptered Book', artist: 'Ann Author' });
    expect(tags.chapters).toEqual([
      { title: 'Opening', startMs: 0 },
      { title: 'Middle – part two', startMs: 1000 },
      { title: 'The End', startMs: 2000 },
    ]);
  });

  it('reads M4B ilst tags, cover and chapters with moov after mdat', () => {
    const tags = readTags(bytesSource(fixture('chapters.m4b')), 'm4b');
    expect(tags).toMatchObject({
      title: 'Chaptered Book',
      album: 'Chaptered Book',
      artist: 'Ann Author',
      albumArtist: 'Ann Author',
      track: 1,
    });
    expect(tags.cover?.mime).toBe('image/png');
    expect(tags.chapters).toEqual([
      { title: 'Opening', startMs: 0 },
      { title: 'Middle – part two', startMs: 1000 },
      { title: 'The End', startMs: 2000 },
    ]);
  });

  it('reads M4A tags with moov before mdat', () => {
    const tags = readTags(bytesSource(fixture('faststart.m4a')), 'm4a');
    expect(tags).toEqual({ title: 'Track Seven', album: 'Faststart Album', artist: 'Some Artist', track: 7, disc: 2 });
  });
});

/** Builds a QuickTime chapter track by stripping `chpl`, so the fallback path is tested. */
describe('readTags: QuickTime chapter track fallback', () => {
  it('reads chapters from the text track when there is no chpl box', () => {
    const bytes = fixture('chapters.m4b').slice();
    const i = findAscii(bytes, 'chpl');
    expect(i).toBeGreaterThan(0);
    bytes.set([0x66, 0x72, 0x65, 0x65], i); // rename chpl → free
    const tags = readTags(bytesSource(bytes), 'm4b');
    expect(tags.chapters?.map((c) => c.title)).toEqual(['Opening', 'Middle – part two', 'The End']);
    expect(tags.chapters?.map((c) => c.startMs)).toEqual([0, 1000, 2000]);
  });
});

describe('readTags: synthetic and broken input', () => {
  const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
  const syncsafe = (n: number) => [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];

  function id3v23(frames: number[][], flags = 0): Uint8Array {
    const body = frames.flat();
    return new Uint8Array([...enc('ID3'), 3, 0, flags, ...syncsafe(body.length), ...body, 0xff, 0xfb, 0, 0]);
  }
  function frame23(id: string, data: number[]): number[] {
    const n = data.length;
    return [...enc(id), (n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff, 0, 0, ...data];
  }

  it('reads Latin-1 frames and falls back to ID3v1 for missing fields', () => {
    const v2 = id3v23([frame23('TIT2', [0, ...enc('Café')])]);
    const v1 = new Uint8Array(128);
    v1.set(enc('TAG'), 0);
    v1.set(enc('Ignored title'), 3);
    v1.set(enc('V1 Artist'), 33);
    v1.set(enc('V1 Album'), 63);
    v1[126] = 9;
    const bytes = new Uint8Array([...v2, ...new Array(50).fill(0), ...v1]);
    expect(readTags(bytesSource(bytes), 'mp3')).toEqual({
      title: 'Café',
      artist: 'V1 Artist',
      album: 'V1 Album',
      track: 9,
    });
  });

  it('undoes tag-wide unsynchronisation', () => {
    // UTF-16LE "ÿ" is FF 00, which unsync writes as FF 00 00.
    const raw = frame23('TALB', [1, 0xff, 0xfe, 0xff, 0x00]);
    const unsynced: number[] = [];
    for (let i = 0; i < raw.length; i++) {
      unsynced.push(raw[i]);
      if (raw[i] === 0xff && (raw[i + 1] === 0x00 || (raw[i + 1] ?? 0) >= 0xe0)) unsynced.push(0);
    }
    expect(readTags(bytesSource(id3v23([unsynced], 0x80)), 'mp3').album).toBe('ÿ');
  });

  it('returns no tags for garbage, truncated files and unknown formats', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const garbage = new Uint8Array(4096).map((_, i) => (i * 7919) % 256);
    expect(readTags(bytesSource(garbage), 'mp3')).toEqual({});
    expect(readTags(bytesSource(garbage), 'm4b')).toEqual({});
    expect(readTags(bytesSource(fixture('chapters.m4b').subarray(0, 1000)), 'm4b')).toEqual({});
    const truncated = fixture('id3v23-cover.mp3').subarray(0, 200);
    expect(() => readTags(bytesSource(truncated), 'mp3')).not.toThrow();
    expect(readTags(bytesSource(new Uint8Array(0)), 'mp3')).toEqual({});
    expect(readTags(bytesSource(fixture('faststart.m4a')), 'ogg')).toEqual({});
    warn.mockRestore();
  });

  it('ignores a picture that is not JPEG or PNG', () => {
    const apic = frame23('APIC', [0, ...enc('image/gif'), 0, 3, 0, ...enc('GIF89a'), 1, 2, 3]);
    expect(readTags(bytesSource(id3v23([apic])), 'mp3').cover).toBeUndefined();
  });
});

function findAscii(bytes: Uint8Array, s: string): number {
  outer: for (let i = 0; i + s.length <= bytes.length; i++) {
    for (let j = 0; j < s.length; j++) if (bytes[i + j] !== s.charCodeAt(j)) continue outer;
    return i;
  }
  return -1;
}

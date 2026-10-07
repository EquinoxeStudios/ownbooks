import { coverColorsFor, hashString } from '../components/GeneratedCover';
import { coverPalette } from '../tokens';

describe('generated covers', () => {
  it('hashes deterministically', () => {
    expect(hashString('Moby-Dick')).toBe(hashString('Moby-Dick'));
    expect(hashString('Moby-Dick')).not.toBe(hashString('Walden'));
  });

  it('always picks a palette colour', () => {
    for (const title of ['', 'A', 'Pride and Prejudice', '日本語のタイトル']) {
      expect(coverPalette).toContain(coverColorsFor(title));
    }
  });
});

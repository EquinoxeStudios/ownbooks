import { naturalCompare, naturalSortBy } from '../naturalSort';
import { formatClock, formatRemaining } from '../time';

describe('naturalSort', () => {
  it('orders numbers numerically', () => {
    const names = ['10.mp3', '2.mp3', '1.mp3', 'Track 11.mp3', 'Track 3.mp3'];
    expect(naturalSortBy(names, (n) => n)).toEqual(['1.mp3', '2.mp3', '10.mp3', 'Track 3.mp3', 'Track 11.mp3']);
  });

  it('ignores case and keeps ties stable', () => {
    expect(naturalCompare('chapter 2', 'Chapter 2')).toBe(0);
    const items = [{ n: 'a', id: 1 }, { n: 'A', id: 2 }];
    expect(naturalSortBy(items, (i) => i.n).map((i) => i.id)).toEqual([1, 2]);
  });
});

describe('time formatting', () => {
  it.each([
    [0, '0:00'],
    [9_999, '0:09'],
    [75_000, '1:15'],
    [3_725_000, '1:02:05'],
    [-5_000, '0:00'],
  ])('formatClock(%i) = %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text);
  });

  it('prefixes remaining time with a minus sign', () => {
    expect(formatRemaining(724_000)).toBe('−12:04');
  });
});

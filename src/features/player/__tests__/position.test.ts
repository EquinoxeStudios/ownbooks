import { fractionOf, fromGlobal, toGlobal, totalDuration } from '../position';

const tracks = [{ durationMs: 1000 }, { durationMs: 2000 }, { durationMs: 3000 }];

describe('multi-track positions', () => {
  it('sums durations', () => {
    expect(totalDuration(tracks)).toBe(6000);
    expect(totalDuration([])).toBe(0);
  });

  it('converts track positions to book positions', () => {
    expect(toGlobal(tracks, 0, 500)).toBe(500);
    expect(toGlobal(tracks, 1, 0)).toBe(1000);
    expect(toGlobal(tracks, 2, 2999)).toBe(5999);
    // Out-of-range input is clamped rather than producing nonsense.
    expect(toGlobal(tracks, 9, 99_999)).toBe(6000);
    expect(toGlobal(tracks, 1, -50)).toBe(1000);
  });

  it('converts book positions back, placing boundaries at the next track', () => {
    expect(fromGlobal(tracks, 0)).toEqual({ trackIdx: 0, positionMs: 0 });
    expect(fromGlobal(tracks, 999)).toEqual({ trackIdx: 0, positionMs: 999 });
    expect(fromGlobal(tracks, 1000)).toEqual({ trackIdx: 1, positionMs: 0 });
    expect(fromGlobal(tracks, 6000)).toEqual({ trackIdx: 2, positionMs: 3000 });
    expect(fromGlobal(tracks, 10_000)).toEqual({ trackIdx: 2, positionMs: 3000 });
    expect(fromGlobal([], 500)).toEqual({ trackIdx: 0, positionMs: 0 });
  });

  it('round-trips', () => {
    for (const g of [0, 1, 999, 1000, 2500, 5999]) {
      const { trackIdx, positionMs } = fromGlobal(tracks, g);
      expect(toGlobal(tracks, trackIdx, positionMs)).toBe(g);
    }
  });

  it('computes the progress fraction', () => {
    expect(fractionOf(tracks, 1, 2000)).toBe(0.5);
    expect(fractionOf([], 0, 0)).toBe(0);
  });
});

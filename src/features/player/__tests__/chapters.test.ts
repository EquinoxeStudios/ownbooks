import { buildChapters, chapterAt, nextChapterStart, previousChapterStart } from '../chapters';

const tracks = (...durations: number[]) => durations.map((d, i) => ({ title: `Track ${i + 1}`, durationMs: d }));

describe('buildChapters', () => {
  it('makes each track a chapter when there are no embedded chapters', () => {
    expect(buildChapters(tracks(1000, 2000, 500), [])).toEqual([
      { title: 'Track 1', trackIdx: 0, startMs: 0, globalStartMs: 0, durationMs: 1000 },
      { title: 'Track 2', trackIdx: 1, startMs: 0, globalStartMs: 1000, durationMs: 2000 },
      { title: 'Track 3', trackIdx: 2, startMs: 0, globalStartMs: 3000, durationMs: 500 },
    ]);
  });

  it('uses embedded chapters of a single file, sorted and de-duplicated', () => {
    const rows = [
      { track_idx: 0, title: 'Two', start_ms: 4000 },
      { track_idx: 0, title: 'One', start_ms: 250 },
      { track_idx: 0, title: 'Dup', start_ms: 4000 },
      { track_idx: 0, title: 'Past the end', start_ms: 99_000 },
    ];
    expect(buildChapters(tracks(10_000), rows)).toEqual([
      { title: 'One', trackIdx: 0, startMs: 0, globalStartMs: 0, durationMs: 4000 },
      { title: 'Two', trackIdx: 0, startMs: 4000, globalStartMs: 4000, durationMs: 6000 },
    ]);
  });

  it('mixes tracks with and without embedded chapters', () => {
    const rows = [
      { track_idx: 1, title: 'A', start_ms: 0 },
      { track_idx: 1, title: 'B', start_ms: 600 },
    ];
    const chapters = buildChapters(tracks(1000, 1000), rows);
    expect(chapters.map((c) => [c.title, c.globalStartMs, c.durationMs])).toEqual([
      ['Track 1', 0, 1000],
      ['A', 1000, 600],
      ['B', 1600, 400],
    ]);
  });
});

describe('chapter navigation', () => {
  const chapters = buildChapters(tracks(10_000, 10_000, 10_000), []);

  it('finds the chapter at a position, including boundaries', () => {
    expect(chapterAt(chapters, 0)).toBe(0);
    expect(chapterAt(chapters, 9_999)).toBe(0);
    expect(chapterAt(chapters, 10_000)).toBe(1);
    expect(chapterAt(chapters, 99_999)).toBe(2);
    expect(chapterAt([], 500)).toBe(0);
  });

  it('restarts the chapter unless close to its start', () => {
    expect(previousChapterStart(chapters, 15_000)).toBe(10_000);
    expect(previousChapterStart(chapters, 11_000)).toBe(0);
    expect(previousChapterStart(chapters, 1_000)).toBe(0);
  });

  it('goes to the next chapter, or nowhere on the last one', () => {
    expect(nextChapterStart(chapters, 500)).toBe(10_000);
    expect(nextChapterStart(chapters, 25_000)).toBeNull();
  });
});

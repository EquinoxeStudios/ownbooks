/**
 * Chapters are what the player navigates by. A track with embedded chapters
 * (M4B, or MP3 with CHAP frames) contributes those; any other track is one
 * chapter on its own, so a 40-file MP3 book has 40 chapters.
 */
export type Chapter = {
  title: string | null;
  trackIdx: number;
  /** Start within its track. */
  startMs: number;
  /** Start within the whole book. */
  globalStartMs: number;
  durationMs: number;
};

type TrackInfo = { title: string | null; durationMs: number };
type ChapterInput = { track_idx: number; title: string | null; start_ms: number };

export function buildChapters(tracks: readonly TrackInfo[], rows: readonly ChapterInput[]): Chapter[] {
  const out: Chapter[] = [];
  let offset = 0;
  for (const [trackIdx, track] of tracks.entries()) {
    const duration = Math.max(0, track.durationMs);
    const starts = rows
      .filter((r) => r.track_idx === trackIdx && (duration === 0 || r.start_ms < duration))
      .sort((a, b) => a.start_ms - b.start_ms)
      .filter((r, i, all) => i === 0 || r.start_ms > all[i - 1].start_ms);

    const parts =
      starts.length > 0
        ? // Anything before the first chapter belongs to it.
          starts.map((r, i) => ({ title: r.title, startMs: i === 0 ? 0 : r.start_ms }))
        : [{ title: track.title, startMs: 0 }];

    parts.forEach((p, i) => {
      const end = i + 1 < parts.length ? parts[i + 1].startMs : duration;
      out.push({
        title: p.title,
        trackIdx,
        startMs: p.startMs,
        globalStartMs: offset + p.startMs,
        durationMs: Math.max(0, end - p.startMs),
      });
    });
    offset += duration;
  }
  return out;
}

/** Index of the chapter playing at a book-wide position. */
export function chapterAt(chapters: readonly Chapter[], globalMs: number): number {
  let lo = 0;
  let hi = chapters.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (chapters[mid].globalStartMs <= globalMs) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Within this much of a chapter's start, "previous" goes to the chapter before. */
export const RESTART_THRESHOLD_MS = 3_000;

/** Where "previous chapter" goes: the current chapter's start, or the one before it. */
export function previousChapterStart(chapters: readonly Chapter[], globalMs: number): number {
  if (chapters.length === 0) return 0;
  const i = chapterAt(chapters, globalMs);
  const into = globalMs - chapters[i].globalStartMs;
  return into > RESTART_THRESHOLD_MS || i === 0 ? chapters[i].globalStartMs : chapters[i - 1].globalStartMs;
}

/** Where "next chapter" goes, or null on the last chapter. */
export function nextChapterStart(chapters: readonly Chapter[], globalMs: number): number | null {
  const i = chapterAt(chapters, globalMs);
  return i + 1 < chapters.length ? chapters[i + 1].globalStartMs : null;
}

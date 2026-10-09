import type { Db } from '../types';

export type ChapterRow = {
  id: string;
  book_id: string;
  track_idx: number;
  title: string | null;
  /** Start within the track. */
  start_ms: number;
};

export async function listChapters(db: Db, bookId: string): Promise<ChapterRow[]> {
  return db.getAllAsync<ChapterRow>(
    'SELECT * FROM chapters WHERE book_id = ? ORDER BY track_idx, start_ms',
    [bookId],
  );
}

/** Inserts chapters with ids derived from their position, so re-reading tags is idempotent. */
export async function insertChapters(
  db: Db,
  bookId: string,
  chapters: readonly { trackIdx: number; title: string | null; startMs: number }[],
): Promise<void> {
  for (const [i, c] of chapters.entries()) {
    await db.runAsync('INSERT INTO chapters (id, book_id, track_idx, title, start_ms) VALUES (?, ?, ?, ?, ?)', [
      `${bookId}:${i}`,
      bookId,
      c.trackIdx,
      c.title,
      Math.max(0, Math.round(c.startMs)),
    ]);
  }
}

import { inTransaction } from '../transaction';
import type { BookRow, BookType, Db } from '../types';

export type LibraryFilter = 'all' | 'audio' | 'ebook';
export type LibrarySort = 'recent' | 'title' | 'author' | 'added';

export type LibraryItem = BookRow & { fraction: number | null };

const ORDER_BY: Record<LibrarySort, string> = {
  // Never-opened books fall back to when they were added.
  recent: 'COALESCE(b.last_opened_at, b.added_at) DESC',
  title: 'b.title COLLATE NOCASE ASC',
  author: "COALESCE(b.author, '') COLLATE NOCASE ASC, b.title COLLATE NOCASE ASC",
  added: 'b.added_at DESC',
};

export async function listLibrary(
  db: Db,
  userId: string,
  filter: LibraryFilter = 'all',
  sort: LibrarySort = 'recent',
): Promise<LibraryItem[]> {
  const where = ['b.user_id = ?'];
  const params: (string | number)[] = [userId];
  if (filter !== 'all') {
    where.push('b.type = ?');
    params.push(filter satisfies BookType);
  }
  return db.getAllAsync<LibraryItem>(
    `SELECT b.*, p.fraction AS fraction
       FROM books b
       LEFT JOIN progress p ON p.book_id = b.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${ORDER_BY[sort]}`,
    params,
  );
}

export async function countBooks(db: Db, userId: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM books WHERE user_id = ?',
    [userId],
  );
  return row?.n ?? 0;
}

export async function getBook(db: Db, id: string): Promise<BookRow | null> {
  return db.getFirstAsync<BookRow>('SELECT * FROM books WHERE id = ?', [id]);
}

export async function findByFingerprint(
  db: Db,
  userId: string,
  fingerprint: string,
): Promise<BookRow | null> {
  return db.getFirstAsync<BookRow>('SELECT * FROM books WHERE user_id = ? AND fingerprint = ?', [
    userId,
    fingerprint,
  ]);
}

export async function markOpened(db: Db, bookId: string, at: number): Promise<void> {
  await db.runAsync('UPDATE books SET last_opened_at = ? WHERE id = ?', [at, bookId]);
}

export type NewTrack = { id: string; filePath: string; title: string | null; durationMs: number };

export type NewAudioBook = {
  id: string;
  userId: string;
  fingerprint: string;
  title: string;
  author: string | null;
  sizeBytes: number;
  tracks: NewTrack[];
  addedAt: number;
};

/** Inserts an audiobook with its tracks and an empty progress row, atomically. */
export async function insertAudioBook(db: Db, book: NewAudioBook): Promise<void> {
  const durationMs = book.tracks.reduce((sum, t) => sum + t.durationMs, 0);
  await inTransaction(db, async (txn) => {
    await txn.runAsync(
      `INSERT INTO books (id, user_id, fingerprint, type, title, author, duration_ms, size_bytes,
                          on_device, added_at, updated_at, dirty)
       VALUES (?, ?, ?, 'audio', ?, ?, ?, ?, 1, ?, ?, 1)`,
      [
        book.id,
        book.userId,
        book.fingerprint,
        book.title,
        book.author,
        durationMs,
        book.sizeBytes,
        book.addedAt,
        book.addedAt,
      ],
    );
    for (const [idx, t] of book.tracks.entries()) {
      await txn.runAsync(
        'INSERT INTO tracks (id, book_id, idx, file_path, title, duration_ms) VALUES (?, ?, ?, ?, ?, ?)',
        [t.id, book.id, idx, t.filePath, t.title, t.durationMs],
      );
    }
    await txn.runAsync(
      `INSERT INTO progress (book_id, track_idx, position_ms, fraction, updated_at, dirty)
       VALUES (?, 0, 0, 0, ?, 0)`,
      [book.id, book.addedAt],
    );
  });
}

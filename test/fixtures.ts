import type { BookRow, Db } from '@/db/types';

let n = 0;

export async function insertBook(db: Db, overrides: Partial<BookRow> = {}): Promise<BookRow> {
  n += 1;
  const now = Date.now();
  const book: BookRow = {
    id: `book-${n}`,
    user_id: 'user-a',
    fingerprint: `fp-${n}`,
    type: 'audio',
    title: `Book ${n}`,
    author: null,
    cover_path: null,
    duration_ms: null,
    size_bytes: null,
    on_device: 1,
    added_at: now,
    last_opened_at: null,
    finished_at: null,
    updated_at: now,
    dirty: 1,
    ...overrides,
  };
  const cols = Object.keys(book);
  await db.runAsync(
    `INSERT INTO books (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    Object.values(book),
  );
  return book;
}

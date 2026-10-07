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

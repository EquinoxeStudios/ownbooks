import { Directory, Paths } from 'expo-file-system';

/**
 * Book files live under <documents>/books/<bookId>/. The database stores paths
 * relative to the documents directory because its absolute location changes
 * between installs on iOS.
 */
export const BOOKS_DIR = 'books';

export function bookDirectory(bookId: string): Directory {
  return new Directory(Paths.document, BOOKS_DIR, bookId);
}

export function deleteBookFiles(bookIds: string[]): void {
  for (const id of bookIds) {
    const dir = bookDirectory(id);
    if (dir.exists) dir.delete();
  }
}

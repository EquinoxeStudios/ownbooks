import { Directory, File, Paths } from 'expo-file-system';

/**
 * Book files live under <documents>/books/<bookId>/. The database stores paths
 * relative to the documents directory because its absolute location changes
 * between installs on iOS.
 */
export const BOOKS_DIR = 'books';

export function bookDirectory(bookId: string): Directory {
  return new Directory(Paths.document, BOOKS_DIR, bookId);
}

/** Absolute file:// URI for a stored relative path, or null if the file is missing. */
export function fileUri(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const file = new File(Paths.document, relativePath);
  return file.exists ? file.uri : null;
}

export function deleteBookFiles(bookIds: string[]): void {
  for (const id of bookIds) {
    const dir = bookDirectory(id);
    if (dir.exists) dir.delete();
  }
}

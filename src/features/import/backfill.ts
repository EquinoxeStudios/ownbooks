import { File, Paths } from 'expo-file-system';

import { applyTags, listBooksWithoutTags, markTagsRead } from '@/db/repositories/books';
import { listTracks } from '@/db/repositories/tracks';
import type { Db } from '@/db/types';
import { BOOKS_DIR } from '@/lib/files';

import { extensionOf, trackTitleFromFilename } from './formats';
import { bookDetails, hasFilenameDetails } from './metadata';
import { readTags, type AudioTags, type CoverImage } from './tags';
import { withFileSource } from './tags/fileSource';

let running = false;

/**
 * Reads the tags of audiobooks imported before tags were supported: adds
 * covers, chapters and track titles. The title and author are replaced only
 * if they are still what the old filename rule produced, so edits are kept.
 * Track order is never changed, because saved positions refer to it.
 */
export async function backfillTags(db: Db, userId: string): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (const book of await listBooksWithoutTags(db, userId)) {
      try {
        await backfillBook(db, book.id, book.title, book.author);
      } catch (error) {
        console.warn('Reading tags of an existing book failed', error);
      }
    }
  } finally {
    running = false;
  }
}

async function backfillBook(db: Db, bookId: string, title: string, author: string | null): Promise<void> {
  const tracks = await listTracks(db, bookId);
  const files = tracks.map((t) => new File(Paths.document, t.file_path));
  // Files missing (e.g. mid-restore): try again on a later launch.
  if (files.length === 0 || files.some((f) => !f.exists)) return;

  let cover: CoverImage | undefined;
  const tags: AudioTags[] = files.map((file) => {
    const t = withFileSource(file, (src) => readTags(src, extensionOf(file.name), { cover: !cover }));
    cover ??= t.cover;
    delete t.cover;
    return t;
  });
  if (tags.every((t) => Object.keys(t).length === 0) && !cover) {
    await markTagsRead(db, bookId);
    return;
  }

  // Tracks were stored with their original filename (minus extension) as the title.
  const names = tracks.map((t, i) => `${t.title ?? ''}.${extensionOf(files[i].name)}`);
  const details = bookDetails(names.map((name, i) => ({ name, tags: tags[i] })));
  const untouched = hasFilenameDetails(title, author, names);
  const changed = details.title !== title || details.author !== author;

  let coverPath: string | null = null;
  if (cover) {
    const name = cover.mime === 'image/png' ? 'cover.png' : 'cover.jpg';
    new File(Paths.document, BOOKS_DIR, bookId, name).write(cover.bytes);
    coverPath = `${BOOKS_DIR}/${bookId}/${name}`;
  }

  await applyTags(db, {
    bookId,
    details: untouched && changed ? { title: details.title, author: details.author } : undefined,
    coverPath,
    trackTitles: tracks.map((t, i) => ({ id: t.id, title: tags[i].title ?? trackTitleFromFilename(names[i]) })),
    chapters: tags.flatMap((t, trackIdx) =>
      (t.chapters ?? []).map((c) => ({ trackIdx, title: c.title, startMs: c.startMs })),
    ),
    at: Date.now(),
  });
}

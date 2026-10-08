import { createTestDb } from '../../../test/nodeDb';
import { migrate } from '../migrations';
import { findByFingerprint, getBook, insertAudioBook, listLibrary, markOpened } from '../repositories/books';
import { getProgress, saveAudioPosition } from '../repositories/progress';
import { listTracks } from '../repositories/tracks';
import type { Db } from '../types';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const book = {
  id: 'b1',
  userId: 'u1',
  fingerprint: 'f'.repeat(64),
  title: 'Frankenstein',
  author: 'Mary Shelley',
  sizeBytes: 300,
  addedAt: 1000,
  tracks: [
    { id: 't2', filePath: 'books/b1/02.mp3', title: 'Two', durationMs: 2000 },
    { id: 't1', filePath: 'books/b1/01.mp3', title: 'One', durationMs: 1000 },
  ],
};

describe('insertAudioBook', () => {
  it('stores the book, tracks in order, and an empty progress row', async () => {
    await insertAudioBook(db, book);
    const row = await getBook(db, 'b1');
    expect(row).toMatchObject({ type: 'audio', title: 'Frankenstein', duration_ms: 3000, on_device: 1, dirty: 1 });
    expect((await listTracks(db, 'b1')).map((t) => [t.idx, t.id])).toEqual([
      [0, 't2'],
      [1, 't1'],
    ]);
    expect(await getProgress(db, 'b1')).toMatchObject({ track_idx: 0, position_ms: 0, fraction: 0, dirty: 0 });
    expect(await findByFingerprint(db, 'u1', 'f'.repeat(64))).not.toBeNull();
  });

  it('rolls back everything when a track insert fails', async () => {
    const broken = { ...book, tracks: [book.tracks[0], { ...book.tracks[1], id: 't2' }] };
    await expect(insertAudioBook(db, broken)).rejects.toThrow();
    expect(await getBook(db, 'b1')).toBeNull();
    expect(await listTracks(db, 'b1')).toEqual([]);
  });
});

describe('progress', () => {
  it('upserts the audio position and marks it dirty', async () => {
    await insertAudioBook(db, book);
    await saveAudioPosition(db, { bookId: 'b1', trackIdx: 1, positionMs: 500.6, fraction: 0.5, speed: 1.25, at: 2000 });
    expect(await getProgress(db, 'b1')).toMatchObject({
      track_idx: 1,
      position_ms: 501,
      fraction: 0.5,
      speed: 1.25,
      updated_at: 2000,
      dirty: 1,
    });
    expect((await listLibrary(db, 'u1'))[0].fraction).toBe(0.5);
  });

  it('records when a book was opened', async () => {
    await insertAudioBook(db, book);
    await markOpened(db, 'b1', 5000);
    expect((await getBook(db, 'b1'))?.last_opened_at).toBe(5000);
  });
});

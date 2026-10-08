import type { Db } from '../types';

export type TrackRow = {
  id: string;
  book_id: string;
  idx: number;
  file_path: string;
  title: string | null;
  duration_ms: number;
};

export async function listTracks(db: Db, bookId: string): Promise<TrackRow[]> {
  return db.getAllAsync<TrackRow>('SELECT * FROM tracks WHERE book_id = ? ORDER BY idx', [bookId]);
}

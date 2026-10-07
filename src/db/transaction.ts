import type { Db } from './types';

type ExclusiveCapable = Db & {
  withExclusiveTransactionAsync(task: (txn: Db) => Promise<void>): Promise<void>;
};

/**
 * Runs `task` atomically. On expo-sqlite this uses an exclusive transaction so
 * unrelated queries running at the same time can't land inside it; elsewhere
 * (node:sqlite in tests) it falls back to BEGIN/COMMIT.
 */
export async function inTransaction<T>(db: Db, task: (txn: Db) => Promise<T>): Promise<T> {
  if ('withExclusiveTransactionAsync' in db) {
    let result!: T;
    await (db as ExclusiveCapable).withExclusiveTransactionAsync(async (txn) => {
      result = await task(txn);
    });
    return result;
  }
  await db.execAsync('BEGIN;');
  try {
    const result = await task(db);
    await db.execAsync('COMMIT;');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK;').catch(() => undefined);
    throw error;
  }
}

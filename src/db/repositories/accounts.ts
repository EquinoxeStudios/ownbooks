import { inTransaction } from '../transaction';
import type { Db } from '../types';
import { userKey } from './kv';

/**
 * Local data is partitioned by user id. When a different account signs in on
 * this device we offer to remove what other accounts left behind.
 */
export async function otherAccountsWithData(db: Db, userId: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ user_id: string }>(
    `SELECT user_id FROM books WHERE user_id <> ?
     UNION
     SELECT user_id FROM activity_days WHERE user_id <> ?`,
    [userId, userId],
  );
  return rows.map((r) => r.user_id);
}

/** Book ids owned by a user; callers delete `books/<id>/` before the rows. */
export async function bookIdsForUser(db: Db, userId: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM books WHERE user_id = ?', [
    userId,
  ]);
  return rows.map((r) => r.id);
}

/** Deletes every local row belonging to a user (tracks, progress etc. cascade). */
export async function deleteUserRows(db: Db, userId: string): Promise<void> {
  await inTransaction(db, async (txn) => {
    await txn.runAsync('DELETE FROM books WHERE user_id = ?', [userId]);
    await txn.runAsync('DELETE FROM activity_days WHERE user_id = ?', [userId]);
    await txn.runAsync('DELETE FROM pending_ops WHERE user_id = ?', [userId]);
    await txn.runAsync("DELETE FROM kv WHERE key LIKE ? ESCAPE '\\'", [
      `${userKey(userId, '').replace(/[%_\\]/g, '\\$&')}%`,
    ]);
  });
}

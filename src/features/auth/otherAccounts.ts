import { bookIdsForUser, deleteUserRows } from '@/db/repositories/accounts';
import type { Db } from '@/db/types';
import { deleteBookFiles } from '@/lib/files';

/**
 * Removes files first, then rows. If interrupted, the remaining rows still
 * list what to delete on retry, instead of leaving untracked files behind.
 */
export async function removeLocalDataFor(db: Db, userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    deleteBookFiles(await bookIdsForUser(db, userId));
    await deleteUserRows(db, userId);
  }
}

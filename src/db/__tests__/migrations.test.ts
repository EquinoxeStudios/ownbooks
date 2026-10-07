import { createTestDb } from '../../../test/nodeDb';
import { LATEST_VERSION, migrate } from '../migrations';

describe('migrate', () => {
  it('creates the schema and records the version', async () => {
    const db = createTestDb();
    expect(await migrate(db)).toBe(LATEST_VERSION);
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      [],
    );
    expect(tables.map((t) => t.name)).toEqual([
      'activity_days',
      'books',
      'chapters',
      'ebook_files',
      'kv',
      'pending_ops',
      'progress',
      'tracks',
    ]);
    db.close();
  });

  it('is idempotent', async () => {
    const db = createTestDb();
    await migrate(db);
    await expect(migrate(db)).resolves.toBe(LATEST_VERSION);
    db.close();
  });

  it('enforces foreign keys so book deletes cascade', async () => {
    const db = createTestDb();
    await migrate(db);
    await db.runAsync(
      `INSERT INTO books (id, user_id, fingerprint, type, title, added_at, updated_at)
       VALUES ('b1', 'u1', 'fp', 'audio', 'T', 0, 0)`,
      [],
    );
    await db.runAsync(`INSERT INTO progress (book_id, updated_at) VALUES ('b1', 0)`, []);
    await db.runAsync(`DELETE FROM books WHERE id = 'b1'`, []);
    const left = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM progress', []);
    expect(left?.n).toBe(0);
    db.close();
  });

  it('rejects a duplicate fingerprint for the same user', async () => {
    const db = createTestDb();
    await migrate(db);
    const insert = (id: string, user: string) =>
      db.runAsync(
        `INSERT INTO books (id, user_id, fingerprint, type, title, added_at, updated_at)
         VALUES (?, ?, 'same', 'ebook', 'T', 0, 0)`,
        [id, user],
      );
    await insert('b1', 'u1');
    await expect(insert('b2', 'u1')).rejects.toThrow(/UNIQUE/);
    await expect(insert('b3', 'u2')).resolves.toBeDefined();
    db.close();
  });
});

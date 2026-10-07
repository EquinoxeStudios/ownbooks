import { createTestDb } from '../../../test/nodeDb';
import { insertBook } from '../../../test/fixtures';
import { migrate } from '../migrations';
import { bookIdsForUser, deleteUserRows, otherAccountsWithData } from '../repositories/accounts';
import { countBooks, listLibrary } from '../repositories/books';
import * as kv from '../repositories/kv';
import type { Db } from '../types';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

describe('kv', () => {
  it('stores, overwrites and removes values', async () => {
    expect(await kv.getString(db, 'k')).toBeNull();
    await kv.setString(db, 'k', 'a');
    await kv.setString(db, 'k', 'b');
    expect(await kv.getString(db, 'k')).toBe('b');
    await kv.remove(db, 'k');
    expect(await kv.getString(db, 'k')).toBeNull();
  });

  it('round-trips JSON and tolerates garbage', async () => {
    await kv.setJson(db, 'j', { a: 1 });
    expect(await kv.getJson(db, 'j')).toEqual({ a: 1 });
    await kv.setString(db, 'bad', '{not json');
    expect(await kv.getJson(db, 'bad')).toBeNull();
  });
});

describe('listLibrary', () => {
  it('only returns the given user’s books', async () => {
    await insertBook(db, { user_id: 'user-a', title: 'Mine' });
    await insertBook(db, { user_id: 'user-b', title: 'Theirs' });
    const items = await listLibrary(db, 'user-a');
    expect(items.map((b) => b.title)).toEqual(['Mine']);
    expect(await countBooks(db, 'user-b')).toBe(1);
  });

  it('filters by type', async () => {
    await insertBook(db, { type: 'audio', title: 'A' });
    await insertBook(db, { type: 'ebook', title: 'E' });
    expect((await listLibrary(db, 'user-a', 'ebook')).map((b) => b.title)).toEqual(['E']);
  });

  it('sorts by recently opened, falling back to added date', async () => {
    await insertBook(db, { title: 'Old, never opened', added_at: 1, last_opened_at: null });
    await insertBook(db, { title: 'Opened yesterday', added_at: 2, last_opened_at: 50 });
    await insertBook(db, { title: 'Added recently', added_at: 100, last_opened_at: null });
    const titles = (await listLibrary(db, 'user-a', 'all', 'recent')).map((b) => b.title);
    expect(titles).toEqual(['Added recently', 'Opened yesterday', 'Old, never opened']);
  });

  it('sorts titles case-insensitively and joins progress', async () => {
    const b = await insertBook(db, { title: 'beta' });
    await insertBook(db, { title: 'Alpha' });
    await db.runAsync('INSERT INTO progress (book_id, fraction, updated_at) VALUES (?, 0.4, 0)', [b.id]);
    const items = await listLibrary(db, 'user-a', 'all', 'title');
    expect(items.map((i) => [i.title, i.fraction])).toEqual([
      ['Alpha', null],
      ['beta', 0.4],
    ]);
  });
});

describe('accounts', () => {
  it('finds other accounts with local data', async () => {
    await insertBook(db, { user_id: 'user-a' });
    await insertBook(db, { user_id: 'user-b' });
    await db.runAsync(
      "INSERT INTO activity_days (user_id, day, updated_at) VALUES ('user-c', '2026-10-07', 0)",
      [],
    );
    expect((await otherAccountsWithData(db, 'user-a')).sort()).toEqual(['user-b', 'user-c']);
    expect(await otherAccountsWithData(db, 'user-z')).toHaveLength(3);
  });

  it('deletes only the given user’s rows and user-scoped keys', async () => {
    const mine = await insertBook(db, { user_id: 'user-a' });
    await insertBook(db, { user_id: 'user-b' });
    await kv.setString(db, kv.userKey('user-b', 'sync.cursor'), 'x');
    await kv.setString(db, kv.userKey('user-a', 'sync.cursor'), 'y');
    await kv.setString(db, kv.KV.deviceId, 'device');

    expect(await bookIdsForUser(db, 'user-a')).toEqual([mine.id]);
    await deleteUserRows(db, 'user-b');

    expect(await countBooks(db, 'user-b')).toBe(0);
    expect(await countBooks(db, 'user-a')).toBe(1);
    expect(await kv.getString(db, kv.userKey('user-b', 'sync.cursor'))).toBeNull();
    expect(await kv.getString(db, kv.userKey('user-a', 'sync.cursor'))).toBe('y');
    expect(await kv.getString(db, kv.KV.deviceId)).toBe('device');
  });

  it('treats LIKE wildcards in user ids literally', async () => {
    await kv.setString(db, kv.userKey('a_c', 'k'), '1');
    await kv.setString(db, kv.userKey('abc', 'k'), '2');
    await deleteUserRows(db, 'a_c');
    expect(await kv.getString(db, kv.userKey('abc', 'k'))).toBe('2');
  });
});

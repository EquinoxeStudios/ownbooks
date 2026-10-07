import { DatabaseSync } from 'node:sqlite';

import type { BindValue, Db } from '@/db/types';

const toNode = (params: BindValue[]) =>
  params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p)) as (string | number | null | Uint8Array)[];

/** In-memory implementation of the app's Db interface on node:sqlite, for tests. */
export function createTestDb(): Db & { close(): void } {
  const db = new DatabaseSync(':memory:');
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params) {
      const r = db.prepare(source).run(...toNode(params));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getAllAsync<T>(source: string, params: BindValue[]) {
      return db.prepare(source).all(...toNode(params)) as T[];
    },
    async getFirstAsync<T>(source: string, params: BindValue[]) {
      return (db.prepare(source).get(...toNode(params)) as T | undefined) ?? null;
    },
    close() {
      db.close();
    },
  };
}

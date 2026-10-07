import type { Db } from '../types';

/** Well-known keys. User-scoped keys are built with `userKey`. */
export const KV = {
  deviceId: 'device.id',
  activeAccount: 'auth.activeAccount',
  onboardingDone: 'onboarding.done',
  onboardingChoice: 'onboarding.choice',
} as const;

export const userKey = (userId: string, key: string) => `user.${userId}.${key}`;

export async function getString(db: Db, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setString(db: Db, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function remove(db: Db, key: string): Promise<void> {
  await db.runAsync('DELETE FROM kv WHERE key = ?', [key]);
}

export async function getJson<T>(db: Db, key: string): Promise<T | null> {
  const raw = await getString(db, key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(db: Db, key: string, value: unknown): Promise<void> {
  await setString(db, key, JSON.stringify(value));
}

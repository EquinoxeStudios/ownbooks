import * as SecureStore from 'expo-secure-store';

/**
 * Supabase auth storage backed by the Keychain / Android Keystore.
 * SecureStore warns above ~2 KB per value and sessions are often larger, so
 * values are split into chunks: `<key>.n` holds the count, `<key>.<i>` the parts.
 */
export const CHUNK_SIZE = 1800;

type Store = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;

export function createChunkedStorage(store: Store = SecureStore) {
  const countKey = (key: string) => `${key}.n`;
  const partKey = (key: string, i: number) => `${key}.${i}`;

  async function readCount(key: string): Promise<number> {
    const raw = await store.getItemAsync(countKey(key));
    const n = raw == null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  async function removeItem(key: string): Promise<void> {
    const n = await readCount(key);
    await store.deleteItemAsync(countKey(key));
    await Promise.all(Array.from({ length: n }, (_, i) => store.deleteItemAsync(partKey(key, i))));
  }

  async function getItem(key: string): Promise<string | null> {
    const n = await readCount(key);
    if (n === 0) return null;
    const parts = await Promise.all(
      Array.from({ length: n }, (_, i) => store.getItemAsync(partKey(key, i))),
    );
    // A missing part means a write was interrupted; treat as no session.
    if (parts.some((p) => p == null)) return null;
    return parts.join('');
  }

  async function setItem(key: string, value: string): Promise<void> {
    const previous = await readCount(key);
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) parts.push(value.slice(i, i + CHUNK_SIZE));
    // Invalidate first so a crash mid-write can't produce a mixed value.
    await store.deleteItemAsync(countKey(key));
    await Promise.all(parts.map((p, i) => store.setItemAsync(partKey(key, i), p)));
    await store.setItemAsync(countKey(key), String(parts.length));
    for (let i = parts.length; i < previous; i++) await store.deleteItemAsync(partKey(key, i));
  }

  return { getItem, setItem, removeItem };
}

import { CHUNK_SIZE, createChunkedStorage } from '../secureStorage';

function memoryStore() {
  const map = new Map<string, string>();
  return {
    map,
    getItemAsync: jest.fn(async (k: string) => map.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      map.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      map.delete(k);
    }),
  };
}

describe('chunked secure storage', () => {
  it('round-trips values larger than one chunk', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store as never);
    const value = 'x'.repeat(CHUNK_SIZE * 2 + 17);
    await storage.setItem('sb-auth', value);
    expect(store.map.get('sb-auth.n')).toBe('3');
    expect(await storage.getItem('sb-auth')).toBe(value);
  });

  it('removes stale chunks when a value shrinks', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store as never);
    await storage.setItem('k', 'a'.repeat(CHUNK_SIZE * 3));
    await storage.setItem('k', 'short');
    expect(await storage.getItem('k')).toBe('short');
    expect([...store.map.keys()].sort()).toEqual(['k.0', 'k.n']);
  });

  it('returns null when nothing is stored or a chunk is missing', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store as never);
    expect(await storage.getItem('missing')).toBeNull();
    await storage.setItem('k', 'b'.repeat(CHUNK_SIZE + 1));
    store.map.delete('k.1');
    expect(await storage.getItem('k')).toBeNull();
  });

  it('removeItem deletes every chunk', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store as never);
    await storage.setItem('k', 'c'.repeat(CHUNK_SIZE * 2));
    await storage.removeItem('k');
    expect(store.map.size).toBe(0);
  });
});

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.SUPABASE_URL ?? process.env.API_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error('Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (see `npx supabase status -o env`).');
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, opts);

type TestUser = { id: string; client: SupabaseClient };

async function createUser(): Promise<TestUser> {
  const email = `rls-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error('createUser failed');
  const client = createClient(url!, anonKey!, opts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

const fp = () => randomUUID().replace(/-/g, '').padEnd(64, '0');
const iso = (ms: number) => new Date(ms).toISOString();

let alice: TestUser;
let bob: TestUser;
let aliceDevice: string;
let aliceBook: string;

beforeAll(async () => {
  alice = await createUser();
  bob = await createUser();
  aliceDevice = randomUUID();
  aliceBook = fp();

  const now = Date.now();
  const steps = [
    alice.client.from('devices').insert({ id: aliceDevice, name: 'Alice phone', platform: 'ios' }),
    alice.client
      .from('books')
      .insert({ fingerprint: aliceBook, type: 'audio', title: 'Secret title', updated_at: iso(now) }),
    alice.client.from('progress').insert({
      fingerprint: aliceBook,
      position_ms: 1000,
      fraction: 0.1,
      device_id: aliceDevice,
      updated_at: iso(now),
    }),
    alice.client
      .from('activity_days')
      .insert({ device_id: aliceDevice, day: '2026-10-07', listen_s: 60, updated_at: iso(now) }),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) throw error;
  }
});

afterAll(async () => {
  for (const u of [alice, bob]) if (u) await admin.auth.admin.deleteUser(u.id);
});

const TABLES = ['devices', 'books', 'progress', 'activity_days'] as const;

describe('row-level security', () => {
  it.each(TABLES)('the owner can read their %s', async (table) => {
    const { data, error } = await alice.client.from(table).select('*');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it.each(TABLES)('another user cannot read %s', async (table) => {
    const { data, error } = await bob.client.from(table).select('*');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.each(TABLES)('a signed-out client cannot read %s', async (table) => {
    const anon = createClient(url!, anonKey!, opts);
    const { data, error } = await anon.from(table).select('*');
    expect(data ?? []).toEqual([]);
    expect(error).not.toBeNull();
  });

  it('another user cannot update or delete rows', async () => {
    const upd = await bob.client
      .from('books')
      .update({ title: 'hacked', updated_at: iso(Date.now() + 1e6) })
      .eq('fingerprint', aliceBook)
      .select();
    expect(upd.data ?? []).toEqual([]);

    const del = await bob.client.from('progress').delete().eq('fingerprint', aliceBook).select();
    expect(del.data ?? []).toEqual([]);

    const { data } = await admin.from('books').select('title').eq('user_id', alice.id).single();
    expect(data?.title).toBe('Secret title');
  });

  it('another user cannot insert rows owned by someone else', async () => {
    const { error } = await bob.client
      .from('books')
      .insert({ user_id: alice.id, fingerprint: fp(), type: 'ebook', title: 'x', updated_at: iso(Date.now()) });
    expect(error?.code).toBe('42501');
  });

  it('a user cannot attach progress to someone else’s device', async () => {
    const book = fp();
    const now = iso(Date.now());
    await bob.client.from('books').insert({ fingerprint: book, type: 'ebook', title: 'b', updated_at: now });
    const { error } = await bob.client
      .from('progress')
      .insert({ fingerprint: book, fraction: 0.2, device_id: aliceDevice, updated_at: now });
    expect(error?.code).toBe('23503');
  });
});

describe('last write wins', () => {
  it('ignores a progress write older than the stored one', async () => {
    const book = fp();
    const t0 = Date.now();
    const c = alice.client;
    await c.from('books').insert({ fingerprint: book, type: 'audio', title: 'LWW', updated_at: iso(t0) });
    await c.from('progress').upsert({ fingerprint: book, position_ms: 5000, fraction: 0.5, updated_at: iso(t0 + 2000) });
    await c.from('progress').upsert({ fingerprint: book, position_ms: 1000, fraction: 0.1, updated_at: iso(t0 + 1000) });

    const { data } = await c.from('progress').select('position_ms').eq('fingerprint', book).single();
    expect(data?.position_ms).toBe(5000);

    await c.from('progress').upsert({ fingerprint: book, position_ms: 9000, fraction: 0.9, updated_at: iso(t0 + 3000) });
    const { data: newer } = await c.from('progress').select('position_ms').eq('fingerprint', book).single();
    expect(newer?.position_ms).toBe(9000);
  });
});

describe('account deletion', () => {
  it('cascades every row when the auth user is deleted', async () => {
    const carol = await createUser();
    const device = randomUUID();
    const book = fp();
    const now = iso(Date.now());
    await carol.client.from('devices').insert({ id: device, name: 'Carol', platform: 'android' });
    await carol.client.from('books').insert({ fingerprint: book, type: 'audio', title: 'c', updated_at: now });
    await carol.client.from('progress').insert({ fingerprint: book, device_id: device, updated_at: now });
    await carol.client.from('activity_days').insert({ device_id: device, day: '2026-10-07', updated_at: now });

    await admin.auth.admin.deleteUser(carol.id);

    for (const table of TABLES) {
      const { data } = await admin.from(table).select('user_id').eq('user_id', carol.id);
      expect(data).toEqual([]);
    }
  });
});

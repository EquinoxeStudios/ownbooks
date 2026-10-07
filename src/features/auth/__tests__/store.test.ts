import { createTestDb } from '../../../../test/nodeDb';
import { insertBook } from '../../../../test/fixtures';
import { migrate } from '@/db/migrations';
import * as kv from '@/db/repositories/kv';
import type { Db } from '@/db/types';

import type { LocalAccount } from '../account';
import { useAuthStore } from '../store';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'device-uuid' }));

const alice: LocalAccount = { id: 'alice', email: 'a@x.io', name: null, provider: 'email' };
const bob: LocalAccount = { id: 'bob', email: 'b@x.io', name: null, provider: 'google' };

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  useAuthStore.setState({
    status: 'loading',
    account: null,
    deviceId: null,
    onboardingDone: false,
    onboardingChoice: null,
    otherAccounts: [],
  });
});
afterEach(() => db.close());

describe('auth store', () => {
  it('hydrates a fresh install as signed out and creates a device id once', async () => {
    await useAuthStore.getState().hydrate(db);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', deviceId: 'device-uuid' });
    expect(await kv.getString(db, kv.KV.deviceId)).toBe('device-uuid');
  });

  it('remembers the account across restarts (works offline)', async () => {
    await useAuthStore.getState().hydrate(db);
    await useAuthStore.getState().signedIn(db, alice);
    useAuthStore.setState({ status: 'loading', account: null });
    await useAuthStore.getState().hydrate(db);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', account: alice, onboardingDone: true });
  });

  it('sign-out hides the library but keeps local books', async () => {
    await insertBook(db, { user_id: 'alice' });
    await useAuthStore.getState().signedIn(db, alice);
    await useAuthStore.getState().signedOut(db);
    expect(useAuthStore.getState().status).toBe('signedOut');
    const n = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM books', []);
    expect(n?.n).toBe(1);
  });

  it('flags other accounts’ data when a different account signs in', async () => {
    await insertBook(db, { user_id: 'alice' });
    await useAuthStore.getState().signedIn(db, alice);
    expect(useAuthStore.getState().otherAccounts).toEqual([]);
    await useAuthStore.getState().signedOut(db);
    await useAuthStore.getState().signedIn(db, bob);
    expect(useAuthStore.getState().otherAccounts).toEqual(['alice']);
  });

  it('does not re-prompt on token refresh for the same account', async () => {
    await insertBook(db, { user_id: 'alice' });
    await useAuthStore.getState().signedIn(db, bob);
    useAuthStore.getState().dismissOtherAccounts();
    await useAuthStore.getState().signedIn(db, bob);
    expect(useAuthStore.getState().otherAccounts).toEqual([]);
  });

  it('stores the onboarding choice', async () => {
    await useAuthStore.getState().completeOnboarding(db, 'audio');
    expect(useAuthStore.getState()).toMatchObject({ onboardingDone: true, onboardingChoice: 'audio' });
    expect(await kv.getString(db, kv.KV.onboardingChoice)).toBe('audio');
  });
});

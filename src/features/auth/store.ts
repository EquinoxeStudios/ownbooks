import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import { otherAccountsWithData } from '@/db/repositories/accounts';
import * as kv from '@/db/repositories/kv';
import type { Db } from '@/db/types';

import type { LocalAccount } from './account';

export type OnboardingChoice = 'audio' | 'ebook' | 'both';

type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  account: LocalAccount | null;
  deviceId: string | null;
  onboardingDone: boolean;
  onboardingChoice: OnboardingChoice | null;
  /** Other accounts with data on this device, shown once after a sign-in. */
  otherAccounts: string[];

  hydrate(db: Db): Promise<void>;
  completeOnboarding(db: Db, choice: OnboardingChoice | null): Promise<void>;
  signedIn(db: Db, account: LocalAccount): Promise<void>;
  signedOut(db: Db): Promise<void>;
  dismissOtherAccounts(): void;
};

/**
 * Local view of who is signed in. It's persisted in SQLite (not only in the
 * Supabase session) so an expired session while offline never locks the user
 * out of books already on the device.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  account: null,
  deviceId: null,
  onboardingDone: false,
  onboardingChoice: null,
  otherAccounts: [],

  async hydrate(db) {
    let deviceId = await kv.getString(db, kv.KV.deviceId);
    if (!deviceId) {
      deviceId = randomUUID();
      await kv.setString(db, kv.KV.deviceId, deviceId);
    }
    const account = await kv.getJson<LocalAccount>(db, kv.KV.activeAccount);
    const onboardingDone = (await kv.getString(db, kv.KV.onboardingDone)) === '1';
    const choice = (await kv.getString(db, kv.KV.onboardingChoice)) as OnboardingChoice | null;
    set({
      deviceId,
      account,
      onboardingDone,
      onboardingChoice: choice,
      status: account ? 'signedIn' : 'signedOut',
    });
  },

  async completeOnboarding(db, choice) {
    await kv.setString(db, kv.KV.onboardingDone, '1');
    if (choice) await kv.setString(db, kv.KV.onboardingChoice, choice);
    set({ onboardingDone: true, onboardingChoice: choice ?? get().onboardingChoice });
  },

  async signedIn(db, account) {
    const previous = get().account;
    await kv.setJson(db, kv.KV.activeAccount, account);
    // Signing in always finishes onboarding (e.g. "Already have an account?").
    await kv.setString(db, kv.KV.onboardingDone, '1');
    const switched = previous?.id !== account.id;
    const others = switched ? await otherAccountsWithData(db, account.id) : get().otherAccounts;
    set({ account, status: 'signedIn', onboardingDone: true, otherAccounts: others });
  },

  async signedOut(db) {
    await kv.remove(db, kv.KV.activeAccount);
    set({ account: null, status: 'signedOut', otherAccounts: [] });
  },

  dismissOtherAccounts() {
    set({ otherAccounts: [] });
  },
}));

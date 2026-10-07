import { getNetworkStateAsync } from 'expo-network';
import { useEffect, type ReactNode } from 'react';

import { useDb } from '@/db/provider';
import { supabase } from '@/lib/supabase';

import { accountFromUser } from './account';
import { useAuthStore } from './store';

/**
 * Loads the local account state, then mirrors Supabase auth events into it.
 * Network trouble never signs the user out; only an explicit sign-out or a
 * session that's provably gone while online does.
 */
export function AuthBridge({ children }: { children: ReactNode }) {
  const db = useDb();

  useEffect(() => {
    let cancelled = false;
    const store = useAuthStore.getState();

    const ready = store.hydrate(db);
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase advises against awaiting inside this callback, so defer.
      setTimeout(async () => {
        await ready;
        if (cancelled) return;
        const { signedIn, signedOut, account } = useAuthStore.getState();
        if (session?.user) {
          await signedIn(db, accountFromUser(session.user));
          return;
        }
        if (event === 'SIGNED_OUT') {
          await signedOut(db);
          return;
        }
        if (event === 'INITIAL_SESSION' && account) {
          // No stored session but a remembered account: only sign out when
          // online, where a missing session can't be a connectivity problem.
          const net = await getNetworkStateAsync().catch(() => null);
          if (net?.isInternetReachable) await signedOut(db);
        }
      }, 0);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [db]);

  return children;
}

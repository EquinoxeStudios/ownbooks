import { addDatabaseChangeListener, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { migrate } from './migrations';
import type { Db } from './types';

export const DATABASE_NAME = 'ownbooks.db';

export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      options={{ enableChangeListener: true }}
      onInit={async (db) => {
        await migrate(db);
      }}
      useSuspense>
      {children}
    </SQLiteProvider>
  );
}

export function useDb(): Db {
  return useSQLiteContext();
}

type LiveQueryState<T> = { data?: T; error?: Error };

/**
 * Runs `query` against SQLite and re-runs it whenever a row in one of `tables`
 * changes, or when `key` changes. `key` must encode every input the query
 * depends on (e.g. the user id and filter). Components read data through this
 * hook or repository calls, never with inline SQL.
 */
export function useLiveQuery<T>(
  query: (db: Db) => Promise<T>,
  tables: string[],
  key: string,
): LiveQueryState<T> {
  const db = useDb();
  const [state, setState] = useState<LiveQueryState<T>>({});
  const queryRef = useRef(query);
  const tablesKey = tables.join(',');

  // Always run the latest closure without re-subscribing on every render.
  useEffect(() => {
    queryRef.current = query;
  });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      queryRef.current(db).then(
        (data) => {
          if (active) setState({ data });
        },
        (e: unknown) => {
          if (active) setState((s) => ({ ...s, error: e instanceof Error ? e : new Error(String(e)) }));
        },
      );
    };

    run();
    const watched = new Set(tablesKey.split(','));
    const sub = addDatabaseChangeListener((event) => {
      if (!watched.has(event.tableName)) return;
      // Coalesce bursts of row changes (e.g. an import) into one re-query.
      clearTimeout(timer);
      timer = setTimeout(run, 50);
    });

    return () => {
      active = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [db, tablesKey, key]);

  return state;
}

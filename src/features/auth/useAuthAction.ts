import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthCancelled, toAuthError } from './providers';

/**
 * Wraps a sign-in step with a busy flag and a translated error message.
 * A cancelled native sheet clears the busy state without showing an error.
 */
export function useAuthAction() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (id: string, action: () => Promise<void>): Promise<boolean> => {
      setBusy(id);
      setError(null);
      try {
        await action();
        return true;
      } catch (e) {
        if (!(e instanceof AuthCancelled)) setError(t(`auth.${toAuthError(e).key}`));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [t],
  );

  return { busy, error, setError, run };
}

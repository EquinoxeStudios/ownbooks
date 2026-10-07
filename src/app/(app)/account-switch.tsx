import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useDb } from '@/db/provider';
import { removeLocalDataFor } from '@/features/auth/otherAccounts';
import { useAuthStore } from '@/features/auth/store';
import { Button, colors, ErrorText, Text } from '@/ui';

export default function AccountSwitch() {
  const { t } = useTranslation();
  const db = useDb();
  const others = useAuthStore((s) => s.otherAccounts);
  const dismiss = useAuthStore((s) => s.dismissOtherAccounts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const close = () => {
    dismiss();
    if (router.canGoBack()) router.back();
  };

  const remove = async () => {
    setBusy(true);
    setError(false);
    try {
      await removeLocalDataFor(db, others);
      close();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.copy}>
        <Text variant="sheetTitle" accessibilityRole="header">
          {t('auth.switch.title')}
        </Text>
        <Text variant="lead">{t('auth.switch.lead')}</Text>
      </View>
      {error ? <ErrorText message={t('auth.errors.generic')} /> : null}
      <Button label={t('auth.switch.keep')} onPress={close} disabled={busy} />
      <Button variant="danger-link" label={t('auth.switch.remove')} onPress={remove} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32, gap: 16 },
  copy: { gap: 10, marginBottom: 6 },
});

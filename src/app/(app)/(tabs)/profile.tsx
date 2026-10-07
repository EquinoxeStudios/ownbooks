import Constants from 'expo-constants';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDb } from '@/db/provider';
import { displayName } from '@/features/auth/account';
import { signOutRemote } from '@/features/auth/providers';
import { useAuthStore } from '@/features/auth/store';
import { env } from '@/lib/env';
import { Button, Card, colors, fonts, Icon, Screen, Text } from '@/ui';

export default function Profile() {
  const { t } = useTranslation();
  const db = useDb();
  const account = useAuthStore((s) => s.account);
  const signedOut = useAuthStore((s) => s.signedOut);
  const [busy, setBusy] = useState(false);

  if (!account) return null;
  const name = displayName(account);

  const signOut = async () => {
    setBusy(true);
    try {
      await signOutRemote();
    } finally {
      // The route guard switches to sign-in once local state is cleared.
      await signedOut(db);
    }
  };

  return (
    <Screen scroll edges={['top']} contentStyle={styles.content}>
      <Text variant="h1" accessibilityRole="header">
        {t('profile.title')}
      </Text>

      <Card style={styles.accountCard}>
        <View style={styles.avatar} accessible={false}>
          <Text style={styles.avatarLetter} color={colors.white}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.accountText}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="meta">{t(`profile.signedInWith.${account.provider}`)}</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <Text variant="h2" accessibilityRole="header">
          {t('profile.settings')}
        </Text>
        <Card padding={0} style={styles.list}>
          <LinkRow label={t('profile.privacy')} onPress={() => openBrowserAsync(`${env.legalBaseUrl}/privacy`)} divider />
          <LinkRow label={t('profile.terms')} onPress={() => openBrowserAsync(`${env.legalBaseUrl}/terms`)} />
        </Card>
      </View>

      <View style={styles.signOut}>
        <Button variant="link" label={t('profile.signOut')} onPress={signOut} disabled={busy} />
        <Text variant="caption" style={styles.center}>
          {t('profile.signOutNote')}
        </Text>
        <Text variant="caption" style={styles.center}>
          {t('profile.version', { version: Constants.expoConfig?.version ?? '' })}
        </Text>
      </View>
    </Screen>
  );
}

function LinkRow({ label, onPress, divider }: { label: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.row, divider && styles.divider, pressed && styles.pressed]}>
          <Text variant="bodyStrong">{label}</Text>
          <Icon name="chevronRight" size={18} color={colors.muted} strokeWidth={2.4} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingBottom: 32 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontFamily: fonts.extraBold, fontSize: 26 },
  accountText: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 26 },
  section: { gap: 12 },
  list: { paddingHorizontal: 18, paddingVertical: 4 },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { borderBottomWidth: 2, borderBottomColor: colors.divider },
  pressed: { opacity: 0.6 },
  signOut: { alignItems: 'center', gap: 4 },
  center: { textAlign: 'center' },
});

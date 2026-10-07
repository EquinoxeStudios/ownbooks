import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { Button, colors, Tag, Text } from '@/ui';

export default function Welcome() {
  const { t } = useTranslation();
  return (
    <OnboardingFrame
      step={1}
      showBack={false}
      footer={
        <>
          <Button label={t('common.continue')} onPress={() => router.push('/private')} />
          <View style={styles.signInRow}>
            <Text variant="meta">{t('onboarding.welcome.haveAccount')}</Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={12}
              onPress={() => router.push({ pathname: '/sign-in', params: { returning: '1' } })}>
              <Text variant="link" style={styles.signInLink}>
                {t('onboarding.welcome.signIn')}
              </Text>
            </Pressable>
          </View>
        </>
      }>
      <View
        style={styles.shelfPanel}
        accessible={false}
        importantForAccessibility="no-hide-descendants">
        <View style={styles.books}>
          <View style={[styles.spine, { width: 34, height: 124, backgroundColor: colors.primary }]} />
          <View style={[styles.spine, { width: 26, height: 96, backgroundColor: colors.amber }]} />
          <View style={[styles.spine, { width: 40, height: 112, backgroundColor: colors.ink }]} />
          <View style={[styles.spine, { width: 24, height: 84, backgroundColor: colors.indigo }]} />
          <View
            style={[
              styles.spine,
              { width: 30, height: 104, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary },
            ]}
          />
        </View>
        <View style={styles.shelf} />
      </View>

      <View style={styles.copy}>
        <Text variant="display" accessibilityRole="header">
          {t('onboarding.welcome.title')}
        </Text>
        <Text variant="lead">{t('onboarding.welcome.lead')}</Text>
      </View>

      <View style={styles.tags}>
        <Tag label={t('onboarding.welcome.tags.free')} />
        <Tag label={t('onboarding.welcome.tags.noAds')} />
        <Tag label={t('onboarding.welcome.tags.openSource')} />
        <Tag label={t('onboarding.welcome.tags.offline')} />
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  shelfPanel: {
    height: 220,
    borderRadius: 28,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  books: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  spine: { borderRadius: 8 },
  shelf: { width: 220, height: 8, borderRadius: 4, backgroundColor: colors.primaryDark, marginTop: 4 },
  copy: { gap: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  signInRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signInLink: { fontSize: 15 },
});

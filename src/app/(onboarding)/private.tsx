import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FeatureRow, IllustrationPanel, OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { colors, Icon, Text } from '@/ui';

export default function NothingUploaded() {
  const { t } = useTranslation();
  return (
    <OnboardingFrame step={2} cta={t('common.continue')} onCta={() => router.push('/progress')}>
      <Text variant="h1" accessibilityRole="header">
        {t('onboarding.private.title')}
      </Text>

      <IllustrationPanel>
        <View style={styles.phone}>
          <View style={[styles.spine, { width: 18, height: 72, backgroundColor: colors.primary }]} />
          <View style={[styles.spine, { width: 14, height: 56, backgroundColor: colors.amber }]} />
          <View style={[styles.spine, { width: 20, height: 64, backgroundColor: colors.indigo }]} />
        </View>
        <View style={styles.cloud}>
          <Icon name="cloudOff" size={36} color={colors.muted} strokeWidth={2} />
        </View>
      </IllustrationPanel>

      <View style={styles.rows}>
        <FeatureRow icon={<Icon name="phone" size={22} color={colors.primaryDark} />}>
          <Text>{t('onboarding.private.local')}</Text>
        </FeatureRow>
        <FeatureRow icon={<Icon name="shield" size={22} color={colors.primaryDark} />}>
          <Text>{t('onboarding.private.privacy')}</Text>
        </FeatureRow>
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  phone: {
    width: 104,
    height: 168,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 16,
    marginRight: 28,
  },
  spine: { borderRadius: 5 },
  cloud: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: { gap: 20 },
});

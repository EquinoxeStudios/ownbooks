import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FeatureRow, IllustrationPanel, OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { colors, Icon, Text } from '@/ui';

function MiniProgress() {
  return (
    <View style={styles.track}>
      <View style={styles.fill} />
    </View>
  );
}

export default function NeverLoseYourPlace() {
  const { t } = useTranslation();
  return (
    <OnboardingFrame step={3} cta={t('common.continue')} onCta={() => router.push('/bring')}>
      <Text variant="h1" accessibilityRole="header">
        {t('onboarding.progress.title')}
      </Text>

      <IllustrationPanel>
        <View style={[styles.device, styles.phone]}>
          <View style={[styles.cover, { height: 56 }]} />
          <MiniProgress />
        </View>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
        <View style={[styles.device, styles.tablet]}>
          <View style={[styles.cover, { height: 44, width: 56 }]} />
          <MiniProgress />
        </View>
      </IllustrationPanel>

      <View style={styles.rows}>
        <FeatureRow icon={<Icon name="bookmark" size={22} color={colors.primaryDark} />}>
          <Text>{t('onboarding.progress.sync')}</Text>
        </FeatureRow>
        <FeatureRow icon={<Icon name="check" size={22} color={colors.primaryDark} />}>
          <Text>{t('onboarding.progress.autosave')}</Text>
        </FeatureRow>
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  device: {
    borderRadius: 18,
    borderWidth: 4,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    justifyContent: 'space-between',
  },
  phone: { width: 84, height: 144, paddingVertical: 12, paddingHorizontal: 10 },
  tablet: { width: 148, height: 112, padding: 12 },
  cover: { borderRadius: 8, backgroundColor: colors.amber },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { width: '47%', height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dots: { flexDirection: 'row', gap: 6, marginHorizontal: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  rows: { gap: 20 },
});

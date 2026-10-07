import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, colors, IconButton, ProgressBar, Screen } from '@/ui';

export const ONBOARDING_STEPS = 5;

type OnboardingFrameProps = {
  step: number;
  children: ReactNode;
  /** Primary action label; omit to render `footer` instead. */
  cta?: string;
  onCta?: () => void;
  footer?: ReactNode;
  showBack?: boolean;
  gap?: number;
};

export function OnboardingFrame({
  step,
  children,
  cta,
  onCta,
  footer,
  showBack = true,
  gap = 40,
}: OnboardingFrameProps) {
  const { t } = useTranslation();
  return (
    <Screen
      scroll
      contentStyle={{ gap, paddingTop: 12, flexGrow: 1 }}
      footer={footer ?? (cta ? <Button label={cta} onPress={onCta} /> : null)}>
      <View style={styles.header}>
        {showBack ? (
          <View style={styles.back}>
            <IconButton
              icon="back"
              accessibilityLabel={t('common.back')}
              strokeWidth={2.6}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
            />
          </View>
        ) : null}
        <View style={styles.bar}>
          <ProgressBar
            value={step / ONBOARDING_STEPS}
            height={12}
            trackColor={colors.border}
            accessibilityLabel={t('common.stepOf', { step, total: ONBOARDING_STEPS })}
          />
        </View>
      </View>
      {children}
    </Screen>
  );
}

/** Mint panel that frames each onboarding illustration. */
export function IllustrationPanel({ children }: { children: ReactNode }) {
  return (
    <View
      style={styles.panel}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

/** Icon bubble + sentence row used under the illustrations. */
export function FeatureRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>{icon}</View>
      <View style={styles.rowText}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { marginLeft: -10 },
  bar: { flex: 1, flexDirection: 'row' },
  panel: {
    height: 220,
    borderRadius: 28,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
});

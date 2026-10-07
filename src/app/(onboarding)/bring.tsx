import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDb } from '@/db/provider';
import { useAuthStore, type OnboardingChoice } from '@/features/auth/store';
import { OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { colors, fonts, Icon, type IconName, Text } from '@/ui';

const OPTIONS: { value: OnboardingChoice; icon: IconName; tile: string; iconColor: string }[] = [
  { value: 'audio', icon: 'headphones', tile: colors.amber, iconColor: colors.ink },
  { value: 'ebook', icon: 'book', tile: colors.primary, iconColor: colors.white },
  { value: 'both', icon: 'library', tile: colors.indigo, iconColor: colors.white },
];

export default function Bring() {
  const { t } = useTranslation();
  const db = useDb();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [choice, setChoice] = useState<OnboardingChoice>('both');

  const next = async () => {
    await completeOnboarding(db, choice);
    router.push('/sign-in');
  };

  return (
    <OnboardingFrame step={4} cta={t('common.next')} onCta={next} gap={32}>
      <View style={styles.copy}>
        <Text variant="h1" accessibilityRole="header">
          {t('onboarding.bring.title')}
        </Text>
        <Text variant="lead">{t('onboarding.bring.lead')}</Text>
      </View>

      <View style={styles.options} accessibilityRole="radiogroup">
        {OPTIONS.map((o) => {
          const selected = o.value === choice;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setChoice(o.value)}>
              {({ pressed }) => (
                <View style={[styles.option, selected && styles.optionSelected, pressed && styles.pressed]}>
                  <View style={[styles.tile, { backgroundColor: o.tile }]}>
                    <Icon name={o.icon} size={24} color={o.iconColor} />
                  </View>
                  <Text style={[styles.label, { fontFamily: selected ? fonts.bold : fonts.medium }]}>
                    {t(`onboarding.bring.${o.value}`)}
                  </Text>
                  <View style={[styles.box, selected && styles.boxSelected]}>
                    {selected ? <Icon name="check" size={16} color={colors.white} strokeWidth={3.5} /> : null}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  copy: { gap: 12 },
  options: { gap: 12 },
  option: {
    minHeight: 84,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  pressed: { opacity: 0.85 },
  tile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 18 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.dashed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxSelected: { borderWidth: 0, backgroundColor: colors.primary },
});

import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, colors, Icon, Screen, Text } from '@/ui';

// Activity totals arrive with sync (milestone 5); this is the empty state.
export default function Activity() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']} contentStyle={styles.content}>
      <Text variant="h1" accessibilityRole="header">
        {t('activity.title')}
      </Text>
      <Card padding={22} style={styles.card}>
        <View style={styles.bubble}>
          <Icon name="activity" size={28} color={colors.primaryDark} />
        </View>
        <Text variant="body" style={styles.text}>
          {t('activity.empty')}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 28 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, color: colors.muted },
});

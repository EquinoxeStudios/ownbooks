import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from './IconButton';

/** 44pt header row with a back arrow, matching the onboarding screens. */
export function BackHeader({ right, color }: { right?: ReactNode; color?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {router.canGoBack() ? (
        <View style={styles.back}>
          <IconButton
            icon="back"
            accessibilityLabel={t('common.back')}
            strokeWidth={2.6}
            color={color}
            onPress={() => router.back()}
          />
        </View>
      ) : (
        <View />
      )}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { marginLeft: -10 },
});

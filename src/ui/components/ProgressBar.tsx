import { StyleSheet, View } from 'react-native';

import { colors } from '../tokens';

type ProgressBarProps = {
  /** 0..1 */
  value: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  accessibilityLabel?: string;
};

export function ProgressBar({
  value,
  height = 8,
  trackColor = colors.primaryTint,
  fillColor = colors.primary,
  accessibilityLabel,
}: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <View
        style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: fillColor }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexGrow: 1, overflow: 'hidden' },
});

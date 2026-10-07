import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, touch } from '../tokens';
import { Text } from './Text';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Filter pill: ink when selected, outlined otherwise. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.base, selected ? styles.selected : styles.idle, pressed && styles.pressed]}>
          <Text
            style={{ fontFamily: selected ? fonts.bold : fonts.medium, fontSize: 15 }}
            color={selected ? colors.white : colors.ink}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Static tag pill used on the welcome screen. */
export function Tag({ label }: { label: string }) {
  return (
    <View style={[styles.tag]}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: touch,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.inkButton },
  idle: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  pressed: { opacity: 0.7 },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
});

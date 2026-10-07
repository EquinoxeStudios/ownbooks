import { Pressable, StyleSheet, View } from 'react-native';

import { colors, touch } from '../tokens';
import { Icon, type IconName } from './Icon';

type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  /** 'ink' = filled dark circle with the lip, 'plain' = bare 44pt target. */
  variant?: 'ink' | 'plain';
  size?: number;
  iconSize?: number;
  color?: string;
  strokeWidth?: number;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  size = touch,
  iconSize = 24,
  color,
  strokeWidth,
}: IconButtonProps) {
  const ink = variant === 'ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={ink ? 0 : 4}
      onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.base,
            { width: size, height: size, borderRadius: size / 2 },
            ink && styles.ink,
            pressed && (ink ? styles.inkPressed : styles.plainPressed),
          ]}>
          <Icon
            name={icon}
            size={iconSize}
            color={color ?? (ink ? colors.white : colors.ink)}
            strokeWidth={strokeWidth}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  ink: {
    backgroundColor: colors.inkButton,
    borderBottomWidth: 3,
    borderBottomColor: colors.inkShadow,
  },
  inkPressed: { borderBottomWidth: 1, transform: [{ translateY: 2 }] },
  plainPressed: { opacity: 0.5 },
});

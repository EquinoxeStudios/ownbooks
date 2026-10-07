import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, fonts, radius, touch } from '../tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'link' | 'danger-link';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  /** Smaller pill size (44pt) used inside cards and lists. */
  compact?: boolean;
};

/**
 * Buttons from the design: the primary ink button sits on a black "lip"
 * (box-shadow 0 4px 0 #000), the secondary one has a 4px bottom border.
 */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  compact = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'link' || variant === 'danger-link') {
    return (
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        disabled={isDisabled}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        {...rest}>
        <Text
          variant="link"
          color={variant === 'danger-link' ? colors.danger : colors.primaryDark}>
          {label}
        </Text>
      </Pressable>
    );
  }

  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      {...rest}>
      {({ pressed }) => (
        <View
          style={[
            compact ? styles.compact : styles.base,
            primary ? styles.primary : styles.secondary,
            pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
            isDisabled && styles.disabled,
          ]}>
          {loading ? (
            <ActivityIndicator color={primary ? colors.white : colors.ink} />
          ) : (
            <Text
              style={[styles.label, compact && styles.compactLabel]}
              color={primary ? colors.white : colors.ink}>
              {label}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 60,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  compact: {
    height: touch,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.inkButton,
    // The "lip" under primary buttons. Shadows don't render a hard offset on
    // Android, so it's drawn as a bottom border instead.
    borderBottomWidth: 4,
    borderBottomColor: colors.inkShadow,
  },
  primaryPressed: { borderBottomWidth: 1, transform: [{ translateY: 3 }] },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
  },
  secondaryPressed: { borderBottomWidth: 2, transform: [{ translateY: 2 }] },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22 },
  compactLabel: { fontSize: 15, lineHeight: 20 },
  link: { minHeight: touch, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});

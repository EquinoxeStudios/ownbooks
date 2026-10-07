import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius } from '../tokens';

type CardProps = ViewProps & { selected?: boolean; padding?: number };

/** White card with a 2px border and the 4px bottom "lip". */
export function Card({ selected = false, padding = 18, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[styles.card, { padding }, selected && styles.selected, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  selected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
});

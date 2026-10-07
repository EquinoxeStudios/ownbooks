import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, space } from '../tokens';

type ScreenProps = {
  children: ReactNode;
  /** Content pinned to the bottom (primary actions). */
  footer?: ReactNode;
  scroll?: boolean;
  background?: string;
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

/**
 * Page frame used by most screens: 20pt gutters, design background, and an
 * optional footer for the main call to action.
 */
export function Screen({
  children,
  footer,
  scroll = false,
  background = colors.bg,
  edges = ['top', 'bottom'],
  contentStyle,
}: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.grow, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: background }]}>
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  grow: { flex: 1 },
  content: { paddingHorizontal: space.gutter, paddingTop: 12, gap: space.xxxl },
  footer: { paddingHorizontal: space.gutter, paddingBottom: 12, paddingTop: 12, gap: 10 },
});

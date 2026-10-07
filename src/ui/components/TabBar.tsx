import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const ICONS: Record<string, IconName> = {
  library: 'library',
  activity: 'activity',
  profile: 'profile',
};

/** Bottom navigation from the design: white bar, 2px top border, green active tab. */
export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;
        const color = focused ? colors.primaryDark : colors.muted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.item}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}>
            <Icon name={ICONS[route.name] ?? 'library'} color={color} strokeWidth={focused ? 2.6 : 2.2} />
            <Text style={[styles.label, { fontFamily: focused ? fonts.bold : fonts.medium }]} color={color}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  item: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 13, lineHeight: 16 },
});

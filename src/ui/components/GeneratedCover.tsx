import { StyleSheet, View } from 'react-native';

import { coverPalette, fonts } from '../tokens';
import { Text } from './Text';

/** Stable, cheap string hash (FNV-1a) so a title always gets the same colour. */
export function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function coverColorsFor(title: string) {
  return coverPalette[hashString(title) % coverPalette.length];
}

type GeneratedCoverProps = {
  title: string;
  width: number;
  height: number;
  radius?: number;
};

/** Placeholder cover from the design: colour tile, title bottom-left in Rubik Black. */
export function GeneratedCover({ title, width, height, radius = 8 }: GeneratedCoverProps) {
  const { bg, fg } = coverColorsFor(title);
  const fontSize = Math.max(9, Math.round(width * 0.19));
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width, height, borderRadius: radius, backgroundColor: bg, padding: Math.round(width * 0.11) }]}>
      <Text
        numberOfLines={4}
        style={{ fontFamily: fonts.black, fontSize, lineHeight: Math.round(fontSize * 1.08) }}
        color={fg}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { justifyContent: 'flex-end', overflow: 'hidden' },
});

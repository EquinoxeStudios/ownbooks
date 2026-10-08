import { StyleSheet, View } from 'react-native';

import { coverColorsFor } from '@/ui/components/GeneratedCover';
import { Text } from '@/ui';
import { fonts } from '@/ui/tokens';

/** The large generated cover on the player screen: author on top, title below. */
export function PlayerCover({ title, author, size }: { title: string; author: string | null; size: number }) {
  const { bg, fg } = coverColorsFor(title);
  const titleSize = Math.round(size * 0.2);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width: size, height: size, backgroundColor: bg, padding: Math.round(size * 0.08) }]}>
      <Text style={styles.author} color={fg} numberOfLines={1}>
        {author ?? ''}
      </Text>
      <Text
        numberOfLines={4}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 0.95) }]}
        color={fg}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 22, justifyContent: 'space-between', alignSelf: 'center' },
  author: { fontFamily: fonts.bold, fontSize: 15 },
  title: { fontFamily: fonts.black, letterSpacing: -1.5 },
});

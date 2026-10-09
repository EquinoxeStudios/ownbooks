import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { coverColorsFor } from '@/ui/components/GeneratedCover';
import { Text } from '@/ui';
import { fonts } from '@/ui/tokens';

type PlayerCoverProps = { uri: string | null; title: string; author: string | null; size: number };

/** The large cover on the player screen: the book's own art, or a generated tile with author and title. */
export function PlayerCover({ uri, title, author, size }: PlayerCoverProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.tile, { width: size, height: size }]}
        contentFit="cover"
        accessible={false}
        transition={0}
      />
    );
  }
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

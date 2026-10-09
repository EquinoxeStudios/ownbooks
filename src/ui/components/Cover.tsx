import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { colors } from '../tokens';
import { GeneratedCover } from './GeneratedCover';

type CoverProps = {
  /** Absolute file:// URI of the book's cover, if it has one. */
  uri?: string | null;
  title: string;
  width: number;
  height: number;
  radius?: number;
};

/** A book's own cover art, or the generated colour tile when it has none. */
export function Cover({ uri, title, width, height, radius = 8 }: CoverProps) {
  if (!uri) return <GeneratedCover title={title} width={width} height={height} radius={radius} />;
  return (
    <Image
      source={{ uri }}
      style={[styles.image, { width, height, borderRadius: radius }]}
      contentFit="cover"
      accessible={false}
      transition={0}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.divider },
});

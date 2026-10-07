import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fonts } from '../tokens';

const variants = StyleSheet.create({
  display: { fontFamily: fonts.black, fontSize: 40, lineHeight: 42, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.black, fontSize: 36, lineHeight: 39, letterSpacing: -0.72 },
  h2: { fontFamily: fonts.extraBold, fontSize: 24, lineHeight: 29 },
  sheetTitle: { fontFamily: fonts.black, fontSize: 32, lineHeight: 35, letterSpacing: -0.64 },
  title: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22 },
  lead: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 25, color: colors.muted },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 24 },
  meta: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.primaryDark },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16 },
});

export type TextVariant = keyof typeof variants;

export type TextProps = RNTextProps & { variant?: TextVariant; color?: string };

export function Text({ variant = 'body', color, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[{ color: colors.ink }, variants[variant], color ? { color } : null, style]}
    />
  );
}

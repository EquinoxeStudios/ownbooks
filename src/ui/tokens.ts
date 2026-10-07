// Design tokens extracted from docs/design/design.html.

export const colors = {
  bg: '#F7F9F6',
  surface: '#FFFFFF',
  ink: '#102019',
  inkButton: '#202420',
  inkShadow: '#000000',
  muted: '#606B67',
  mutedStrong: '#3F4C47',
  border: '#D9E1DD',
  divider: '#EEF2EF',
  dashed: '#8A968F',
  primary: '#147B5B',
  primaryDark: '#0E5D45',
  primaryTint: '#DFF5EC',
  amber: '#F2B33D',
  indigo: '#3847A5',
  danger: '#A12A1E',
  white: '#FFFFFF',
  scrim: '#0A1410',
} as const;

export const playerColors = {
  bg: '#102019',
  text: '#FFFFFF',
  muted: '#B5C4BD',
  track: '#2C3F37',
  ring: '#5A6E65',
  accent: '#F2B33D',
} as const;

export const readerThemes = {
  light: { bg: '#FFFFFF', text: '#102019', muted: '#606B67' },
  sepia: { bg: '#F1E9D8', text: '#2A241A', muted: '#5C5140' },
  dark: { bg: '#102019', text: '#E8EEEA', muted: '#B5C4BD' },
} as const;

export const fonts = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  bold: 'Rubik_700Bold',
  extraBold: 'Rubik_800ExtraBold',
  black: 'Rubik_900Black',
  reader: 'Literata_400Regular',
  readerItalic: 'Literata_400Regular_Italic',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  button: 20,
  card: 22,
  sheet: 28,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  gutter: 20,
} as const;

/** Minimum touch target, from the design (44pt). */
export const touch = 44;

/** Palette used for generated covers when a book has no artwork. */
export const coverPalette = [
  { bg: colors.amber, fg: colors.ink },
  { bg: colors.primary, fg: colors.white },
  { bg: colors.indigo, fg: colors.white },
  { bg: colors.ink, fg: colors.white },
  { bg: colors.primaryTint, fg: colors.primaryDark },
] as const;

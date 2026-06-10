import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0A0A0A',
    textDim: 'rgba(10,10,10,0.55)',
    textSubtle: 'rgba(10,10,10,0.38)',
    background: '#FAFAFA',
    card: '#FFFFFF',
    cardBorder: 'rgba(10,10,10,0.07)',
    hairline: 'rgba(10,10,10,0.10)',
    invertBg: '#0A0A0A',
    invertText: '#FAFAFA',
  },
  dark: {
    text: '#FAFAFA',
    textDim: 'rgba(250,250,250,0.55)',
    textSubtle: 'rgba(250,250,250,0.38)',
    background: '#0A0A0A',
    card: '#171717',
    cardBorder: 'rgba(250,250,250,0.08)',
    hairline: 'rgba(250,250,250,0.12)',
    invertBg: '#FAFAFA',
    invertText: '#0A0A0A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = { readonly [K in ThemeColor]: string };

// Typography tokens — Bricolage Grotesque (display) + Manrope (body) + Material Symbols (icons)
export const Font = {
  displayMed:    'BricolageGrotesque_500Medium',
  displaySemi:   'BricolageGrotesque_600SemiBold',
  displayBold:   'BricolageGrotesque_700Bold',
  displayBlack:  'BricolageGrotesque_800ExtraBold',
  bodyReg:       'Manrope_400Regular',
  bodyMed:       'Manrope_500Medium',
  bodySemi:      'Manrope_600SemiBold',
  bodyBold:      'Manrope_700Bold',
  icon:          'MaterialSymbols_400Regular',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
  pill: 9999,
} as const;

export const MaxContentWidth = 480;

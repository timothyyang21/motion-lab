/**
 * Theme tokens. Colour, elevation, and type only — nothing that moves.
 *
 * The rule underneath this palette: colour is scarce. The interface is
 * achromatic apart from one cold accent and the two flash hues, so the flash
 * on a price tick and the fill on a confirm are the only moments the screen
 * produces colour at all. That is what makes them mean something.
 *
 * The accent holds the same hue (~195deg) in both themes so the signature
 * survives the ground change — pale on dark where it reads as emitted light,
 * darker and more saturated on light where it reads as ink.
 */

export type Theme = {
  ground: string;
  surface: string;
  surfaceRaised: string;
  hairline: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentOn: string;
  scrim: string;
  shadow: string;
  flashUp: string;
  flashDown: string;
};

export const lightTheme: Theme = {
  // Not pure white. Pure ground gives the sheet nothing to sit against.
  ground: '#F7F8F9',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  hairline: 'rgba(16, 20, 24, 0.10)',
  textPrimary: '#0E1215',
  textSecondary: '#5C6570',
  textTertiary: '#98A1AB',
  accent: '#0E7490',
  accentOn: '#FFFFFF',
  // Not black-at-opacity: black over white goes grey and reads cheap.
  scrim: 'rgba(14, 18, 21, 0.28)',
  shadow: '#0E1215',
  flashUp: '#0F7A4A',
  flashDown: '#B3261E',
};

export const darkTheme: Theme = {
  ground: '#0C0E10',
  surface: '#141719',
  surfaceRaised: '#1B1F22',
  hairline: 'rgba(255, 255, 255, 0.10)',
  textPrimary: '#F2F4F5',
  textSecondary: '#9AA3AC',
  textTertiary: '#626B74',
  accent: '#67D3EA',
  accentOn: '#06222A',
  scrim: 'rgba(0, 0, 0, 0.55)',
  shadow: '#000000',
  flashUp: '#4ADE80',
  flashDown: '#F87171',
};

/** Type scale. Tabular numerals are applied at the component level, everywhere. */
export const typeScale = {
  balance: { fontSize: 44, letterSpacing: -1.2, fontWeight: '600' as const },
  rowLabel: { fontSize: 15, letterSpacing: -0.1, fontWeight: '500' as const },
  rowValue: { fontSize: 15, letterSpacing: -0.1, fontWeight: '500' as const },
  caption: { fontSize: 12, letterSpacing: 0.2, fontWeight: '500' as const },
  sheetTitle: { fontSize: 22, letterSpacing: -0.4, fontWeight: '600' as const },
  button: { fontSize: 16, letterSpacing: 0.1, fontWeight: '600' as const },
};

/** Applied to every numeric Text in the app. No exceptions. */
export const tabular = { fontVariant: ['tabular-nums' as const] };

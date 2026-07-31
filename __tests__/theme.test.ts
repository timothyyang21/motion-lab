import { lightTheme, darkTheme } from '../src/tokens/theme';

describe('theme parity', () => {
  it('light and dark expose identical keys', () => {
    expect(Object.keys(lightTheme).sort()).toEqual(Object.keys(darkTheme).sort());
  });

  it('every value is a non-empty string', () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const value of Object.values(theme)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('scarce colour', () => {
  // The interface is achromatic except for the accent and the two flashes.
  // These are the only keys permitted to carry saturation.
  const CHROMATIC = ['accent', 'accentOn', 'flashUp', 'flashDown'];

  it('names exactly the chromatic keys we intend', () => {
    const chromaticInLight = Object.keys(lightTheme).filter((k) => CHROMATIC.includes(k));
    expect(chromaticInLight.sort()).toEqual([...CHROMATIC].sort());
  });
});

describe('ground', () => {
  it('is never pure black or pure white — pure ground kills the depth the sheet needs', () => {
    expect(lightTheme.ground.toLowerCase()).not.toBe('#ffffff');
    expect(lightTheme.ground.toLowerCase()).not.toBe('#fff');
    expect(darkTheme.ground.toLowerCase()).not.toBe('#000000');
    expect(darkTheme.ground.toLowerCase()).not.toBe('#000');
  });
});

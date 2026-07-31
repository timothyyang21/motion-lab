import { formatDigits, rollDirection } from '../src/lib/digits';

describe('formatDigits', () => {
  it('splits a value into individual display characters', () => {
    expect(formatDigits(1234.5, 2)).toEqual(['1', ',', '2', '3', '4', '.', '5', '0']);
  });

  it('pads decimals', () => {
    expect(formatDigits(7, 2)).toEqual(['7', '.', '0', '0']);
  });

  it('groups thousands', () => {
    expect(formatDigits(1000000, 0)).toEqual(['1', ',', '0', '0', '0', ',', '0', '0', '0']);
  });

  it('handles zero', () => {
    expect(formatDigits(0, 2)).toEqual(['0', '.', '0', '0']);
  });

  it('handles negatives', () => {
    expect(formatDigits(-42, 0)).toEqual(['-', '4', '2']);
  });
});

describe('rollDirection', () => {
  it('rolls up when the value rises', () => {
    expect(rollDirection(100, 120)).toBe(1);
  });

  it('rolls down when the value falls', () => {
    // A balance dropping should be felt as a descent, not just a different number.
    expect(rollDirection(120, 100)).toBe(-1);
  });

  it('does not roll when the value is unchanged', () => {
    expect(rollDirection(100, 100)).toBe(0);
  });
});

import { criticalDamping, isAtOrAboveCritical } from '../src/lib/damping';
import { motion } from '../src/tokens/motion';

describe('criticalDamping', () => {
  it('computes 2*sqrt(stiffness*mass)', () => {
    expect(criticalDamping(200, 1)).toBeCloseTo(28.284, 3);
    expect(criticalDamping(320, 1)).toBeCloseTo(35.777, 3);
    expect(criticalDamping(100, 4)).toBeCloseTo(40, 3);
  });
});

describe('isAtOrAboveCritical', () => {
  it('accepts a spring exactly at critical damping', () => {
    // Use the computed boundary, not a rounded copy of it. 28.284 is a hair
    // BELOW critical (28.28427...) and the guard is right to reject it.
    expect(
      isAtOrAboveCritical({ damping: criticalDamping(200, 1), stiffness: 200, mass: 1 }),
    ).toBe(true);
  });

  it('rejects a spring a hair below critical', () => {
    expect(
      isAtOrAboveCritical({
        damping: criticalDamping(200, 1) - 0.001,
        stiffness: 200,
        mass: 1,
      }),
    ).toBe(false);
  });

  it('accepts an overdamped spring', () => {
    expect(isAtOrAboveCritical({ damping: 40, stiffness: 200, mass: 1 })).toBe(true);
  });

  it('rejects an underdamped spring', () => {
    expect(isAtOrAboveCritical({ damping: 20, stiffness: 200, mass: 1 })).toBe(false);
  });
});

describe('every exported spring', () => {
  it('is at or above critical damping — no overshoot, anywhere', () => {
    const offenders = Object.entries(motion.springs)
      .filter(([, spring]) => !isAtOrAboveCritical(spring))
      .map(
        ([name, spring]) =>
          `${name}: damping ${spring.damping} < critical ${criticalDamping(
            spring.stiffness,
            spring.mass,
          ).toFixed(2)}`,
      );

    expect(offenders).toEqual([]);
  });

  it('applies the same guarantee to reduced-motion springs', () => {
    const offenders = Object.entries(motion.reduced.springs)
      .filter(([, spring]) => !isAtOrAboveCritical(spring))
      .map(([name]) => name);

    expect(offenders).toEqual([]);
  });
});

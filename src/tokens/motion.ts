import type { SpringConfig } from '../lib/damping';

/**
 * Motion tokens. These never vary with theme.
 *
 * If you ever find yourself wanting a spring constant to differ between light
 * and dark, something has gone wrong upstream — that's a theme concern wearing
 * a motion costume.
 *
 * Every spring here is at or above critical damping:
 *
 *   critical = 2 * sqrt(stiffness * mass)
 *
 * Bounce on a screen holding someone's savings reads as toy. The test in
 * __tests__/damping.test.ts enforces this on every spring in this file, so
 * an underdamped constant fails the build rather than shipping as a feel bug.
 */

const springs = {
  /** Sheet settling into a detent. critical at (200, 1) = 28.28 */
  sheetSettle: { damping: 30, stiffness: 200, mass: 1 },

  /** Hold-to-confirm snapping back on early release. critical at (320, 1) = 35.78 */
  confirmCancel: { damping: 38, stiffness: 320, mass: 1 },

  /**
   * A balance falling after a commit. Heavier and slower than the others —
   * this one is supposed to land, not tidy itself away.
   * critical at (120, 1.6) = 27.71
   */
  commitSettle: { damping: 30, stiffness: 120, mass: 1.6 },
} satisfies Record<string, SpringConfig>;

export const motion = {
  springs,

  /**
   * Apple's scroll deceleration constant — "Designing Fluid Interfaces",
   * WWDC 2018. Used to project where a flick would come to rest.
   */
  decelerationRate: 0.998,

  /**
   * Sheet detents as a fraction of screen height. Three, not two: with only
   * one boundary, threshold-snapping and velocity projection agree almost
   * everywhere and the naive-vs-tuned comparison has nothing to show.
   */
  detentFractions: [0.28, 0.58, 0.92],

  /** Resistance applied when dragging past the topmost detent. */
  rubberBandFactor: 0.55,

  /** Hold-to-confirm build. Linear — an eased fill lies about progress. */
  confirmBuildMs: 700,

  /**
   * The haptic fires this many ms before the visual settles. Firing together
   * reads as slightly late; leading reads as responsive. Same event, different
   * perceived latency.
   */
  confirmHapticLeadMs: 40,

  /** Delay between adjacent digits in a roll. */
  digitStaggerMs: 25,

  /** Price-tick flash decay. Decays — never persists. */
  tickDecayMs: 600,

  /**
   * Reduced motion is a second set of values, not a kill switch. Things still
   * move; they travel less and settle sooner. Disabling animation outright is
   * the lazy read of the setting — and removing progress feedback would be an
   * accessibility regression dressed up as a courtesy.
   */
  reduced: {
    springs: {
      sheetSettle: { damping: 40, stiffness: 260, mass: 1 },
      confirmCancel: { damping: 44, stiffness: 400, mass: 1 },
      commitSettle: { damping: 40, stiffness: 200, mass: 1 },
    } satisfies Record<string, SpringConfig>,
    /** Fraction of normal travel distance for entrance transforms. */
    travelScale: 0.25,
    digitStaggerMs: 0,
    tickDecayMs: 300,
  },
} as const;

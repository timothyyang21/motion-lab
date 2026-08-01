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

  /**
   * Sheet entering from off-screen. Snappier than sheetSettle because the
   * travel is much longer — the same spring that feels right settling 200px
   * feels sluggish covering 800px. Presentation should feel immediate;
   * settling should feel considered.
   * critical at (460, 1) = 42.90
   */
  sheetPresent: { damping: 44, stiffness: 460, mass: 1 },

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

  /** Hold-to-confirm build. */
  confirmBuildMs: 700,

  /**
   * Cubic-bezier control points for the fill — easeInCubic.
   *
   * Deliberately NOT linear. A linear fill is the honest choice about time
   * remaining, and it's the obvious one; an accelerating fill instead makes
   * commitment feel like it gathers. The hard part is the beginning, and once
   * you're past it the thing pulls toward completion.
   *
   * The trade-off is real and worth stating: at half the elapsed time the fill
   * is only ~12% across, so it under-reports progress. That's acceptable here
   * because this control isn't reporting a download — it's asking whether you
   * mean it.
   *
   * Kept as plain numbers rather than an Easing object so this file stays
   * dependency-free and unit-testable.
   */
  confirmFillBezier: [0.55, 0.055, 0.675, 0.19],

  /**
   * The bloom on commit. Rises faster than it falls — a flash that fades in
   * as slowly as it fades out reads as a glow, not a confirmation. The fall is
   * long enough to feel like a settle rather than a blink.
   */
  commitBloomAttackMs: 80,
  commitBloomDecayMs: 420,

  /**
   * The haptic fires this many ms before the visual settles. Firing together
   * reads as slightly late; leading reads as responsive. Same event, different
   * perceived latency.
   */
  confirmHapticLeadMs: 40,

  /** Delay between adjacent digits in a roll. */
  digitStaggerMs: 25,

  /**
   * How long a digit takes to roll out of its slot and the next to roll in.
   * The commit roll is deliberately slower — a balance moving should be
   * legible as a single event, not a flicker.
   */
  digitRollMs: { tick: 190, commit: 300 },

  /**
   * Peak flash intensity, 0..1. Deliberately short of full saturation: a tick
   * is ambient information, and information does not need to shout. Reaching
   * the full flash colour is what made this read as garish.
   */
  tickFlashPeak: 0.72,

  /**
   * Price-tick flash attack. Not zero: snapping instantly to full colour is
   * what makes a tick read as garish. A short rise reads as a pulse rather
   * than a light switch.
   */
  tickAttackMs: 90,

  /**
   * How long the flash sits at full peak before it starts decaying. A slower
   * decay alone doesn't read as "staying" — it reads as a long dissolve,
   * because it starts leaving the moment it arrives. The hold is what makes
   * the colour feel like it landed.
   */
  tickHoldMs: 200,

  /** Price-tick flash decay. Decays — never persists. */
  tickDecayMs: 900,

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

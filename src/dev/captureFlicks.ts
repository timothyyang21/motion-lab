/**
 * The apparatus behind naive-vs-tuned.gif. The README discloses that those
 * flicks are synthetic, so this file has to stay — a disclosure a reader can't
 * go and check is worth nothing.
 *
 * Fixed gesture velocities, in points per second, negative for upward. These
 * exist so the naive/tuned comparison can be filmed as a controlled experiment
 * rather than a demonstration of steady thumbs.
 *
 * A hand cannot produce the same velocity twice, and worse, it varies two
 * things at once: a hard flick also DRAGS the sheet further before release, so
 * `position` moves along with `velocity`. Since the naive algorithm snaps one
 * detent from wherever the finger let go, a hard human throw climbs two stops —
 * one from the drag, one from the threshold — and the comparison collapses,
 * because both algorithms end up in the same place for reasons that have
 * nothing to do with either algorithm.
 *
 * Feeding a fixed velocity in at the current position holds `position` still
 * and varies only `velocity`, which is the actual subject.
 *
 * Chosen against the detents at 0.28 / 0.58 / 0.92 on a 874pt screen, fired
 * with the sheet resting at the bottom stop:
 *
 *              SOFT (-700)      HARD (-2600)
 *   tuned      middle           top
 *   naive      middle           middle
 *
 * Tuned projects the hard flick clean past the middle; naive climbs exactly one
 * stop whatever you feed it. Both values sit above the naive threshold of 500,
 * so naive treats them as the same event — which is the point.
 */
export const captureFlicks = {
  soft: -700,
  hard: -2600,
} as const;

export type FlickKind = keyof typeof captureFlicks;

export type CaptureFlick = { velocity: number; nonce: number };

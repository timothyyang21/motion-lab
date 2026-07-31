/**
 * Pure gesture math. No React, no Reanimated, no platform — which is what
 * makes it testable. Everything here is worklet-safe.
 */

/**
 * Project where a flick would come to rest if released now.
 *
 *   projected = position + (velocity / 1000) * (rate / (1 - rate))
 *
 * The /1000 matters. Gesture velocity arrives in points per SECOND, and the
 * deceleration identity is expressed in points per millisecond. Apple's
 * "Designing Fluid Interfaces" sample (WWDC 2018) divides first. Omit it and
 * an ordinary 800 px/s flick projects to roughly 400,000px, every release
 * pins to an extreme detent, and velocity projection quietly degenerates into
 * a very expensive threshold.
 *
 * This is the difference between a flick landing where the hand meant it to
 * and a flick landing where an `if` statement meant it to.
 */
export function projectDestination(
  position: number,
  velocity: number,
  decelerationRate = 0.998,
): number {
  'worklet';
  return position + (velocity / 1000) * (decelerationRate / (1 - decelerationRate));
}

/**
 * Snap to whichever detent the projected resting position is closest to.
 *
 * Ties resolve toward the earlier detent — deterministic, so a gesture landing
 * on an exact midpoint never flickers between two answers frame to frame.
 */
export function nearestDetent(target: number, detents: number[]): number {
  'worklet';
  let best = detents[0];
  let bestDistance = Math.abs(detents[0] - target);
  for (let i = 1; i < detents.length; i++) {
    const distance = Math.abs(detents[i] - target);
    if (distance < bestDistance) {
      best = detents[i];
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * The naive implementation, kept deliberately.
 *
 * `if (velocity > threshold) moveOneDetent` — no projection, no notion of how
 * hard the flick was. A gentle nudge and a violent throw produce the same
 * result, which is exactly what feels wrong about it and exactly why it is
 * worth showing side by side.
 *
 * Wired to the runtime toggle so the README comparison is provably the same
 * build, the same device, and the same hand.
 */
export function thresholdDetent(
  position: number,
  velocity: number,
  detents: number[],
  threshold = 500,
): number {
  'worklet';
  const current = nearestDetent(position, detents);
  const index = detents.indexOf(current);

  if (velocity > threshold) {
    return detents[Math.min(index + 1, detents.length - 1)];
  }
  if (velocity < -threshold) {
    return detents[Math.max(index - 1, 0)];
  }
  return current;
}

/**
 * iOS-style rubber banding. Resistance grows the further you pull, and the
 * result asymptotically approaches `dimension` without reaching it — so there
 * is no hard stop to hit, only an increasing unwillingness.
 */
export function rubberBand(overshoot: number, dimension: number, factor: number): number {
  'worklet';
  return (1 - 1 / ((overshoot * factor) / dimension + 1)) * dimension;
}

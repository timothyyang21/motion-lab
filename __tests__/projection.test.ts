import {
  projectDestination,
  nearestDetent,
  thresholdDetent,
  rubberBand,
} from '../src/lib/projection';

describe('projectDestination', () => {
  it('returns the current position when velocity is zero', () => {
    expect(projectDestination(300, 0)).toBe(300);
  });

  it('treats velocity as px/SECOND, not px/ms', () => {
    // Apple's WWDC 2018 sample divides by 1000 before applying the factor.
    // Without it, an ordinary 800 px/s flick projects ~400,000px and every
    // release pins to an extreme detent.
    const projected = projectDestination(0, 1000);
    expect(projected).toBeCloseTo(499, 0);
    expect(projected).toBeLessThan(1000);
  });

  it('projects downward for positive velocity and upward for negative', () => {
    expect(projectDestination(500, 400)).toBeGreaterThan(500);
    expect(projectDestination(500, -400)).toBeLessThan(500);
  });

  it('scales linearly with velocity', () => {
    const a = projectDestination(0, 500);
    const b = projectDestination(0, 1000);
    expect(b).toBeCloseTo(a * 2, 5);
  });
});

describe('nearestDetent', () => {
  const detents = [100, 400, 700];

  it('picks the closest detent to the projected target', () => {
    expect(nearestDetent(120, detents)).toBe(100);
    expect(nearestDetent(390, detents)).toBe(400);
    expect(nearestDetent(690, detents)).toBe(700);
  });

  it('picks correctly when the target is outside the detent range', () => {
    expect(nearestDetent(-500, detents)).toBe(100);
    expect(nearestDetent(9000, detents)).toBe(700);
  });

  it('breaks exact ties toward the earlier detent, deterministically', () => {
    expect(nearestDetent(250, detents)).toBe(100);
  });
});

describe('thresholdDetent (the naive comparison)', () => {
  const detents = [100, 400, 700];

  it('moves one detent in the direction of a fast flick', () => {
    expect(thresholdDetent(400, -900, detents)).toBe(100);
    expect(thresholdDetent(400, 900, detents)).toBe(700);
  });

  it('ignores how hard the flick was — this is the flaw being demonstrated', () => {
    expect(thresholdDetent(400, -600, detents)).toBe(thresholdDetent(400, -5000, detents));
  });

  it('falls back to nearest detent below the velocity threshold', () => {
    expect(thresholdDetent(420, 50, detents)).toBe(400);
  });

  it('differs from the tuned result on a hard flick — otherwise there is nothing to compare', () => {
    const hard = -3000;
    const naive = thresholdDetent(700, hard, detents);
    const tuned = nearestDetent(projectDestination(700, hard), detents);
    expect(naive).not.toBe(tuned);
  });

  it('clamps at the ends rather than running off the array', () => {
    expect(thresholdDetent(100, -5000, detents)).toBe(100);
    expect(thresholdDetent(700, 5000, detents)).toBe(700);
  });
});

describe('rubberBand', () => {
  it('returns zero resistance at zero overshoot', () => {
    expect(rubberBand(0, 800, 0.55)).toBeCloseTo(0, 5);
  });

  it('returns less than the raw overshoot', () => {
    expect(rubberBand(100, 800, 0.55)).toBeLessThan(100);
  });

  it('compresses harder the further you pull', () => {
    const ratioNear = rubberBand(50, 800, 0.55) / 50;
    const ratioFar = rubberBand(400, 800, 0.55) / 400;
    expect(ratioFar).toBeLessThan(ratioNear);
  });

  it('never exceeds the dimension it is bounded by', () => {
    expect(rubberBand(100000, 800, 0.55)).toBeLessThan(800);
  });

  it('increases monotonically — resistance never reverses', () => {
    let previous = 0;
    for (let overshoot = 10; overshoot <= 500; overshoot += 10) {
      const current = rubberBand(overshoot, 800, 0.55);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
  });
});

describe('the naive-vs-tuned capture', () => {
  // CAPTURE SCAFFOLD — temporary, alongside src/dev/captureFlicks.ts.
  //
  // The comparison GIF is a controlled experiment, so its outcome should be a
  // prediction that holds before anyone points a camera at it — not something
  // discovered on the ninth take. These are the real detents on the capture
  // device, and the two velocities the dev panel fires.
  const H = 874;
  const STOPS = [0.28, 0.58, 0.92]
    .map((fraction) => H * (1 - fraction))
    .sort((a, b) => a - b)
    .concat(H);

  const [TOP, MIDDLE, BOTTOM] = STOPS;
  const SOFT = -700;
  const HARD = -2600;

  const tuned = (velocity: number) =>
    nearestDetent(projectDestination(BOTTOM, velocity, 0.998), STOPS);
  const naive = (velocity: number) => thresholdDetent(BOTTOM, velocity, STOPS);

  it('tuned sends a hard flick further than a soft one', () => {
    expect(tuned(SOFT)).toBe(MIDDLE);
    expect(tuned(HARD)).toBe(TOP);
  });

  it('naive cannot tell them apart — one stop either way', () => {
    expect(naive(SOFT)).toBe(MIDDLE);
    expect(naive(HARD)).toBe(MIDDLE);
  });

  it('both velocities clear the naive threshold, so naive treats them as one event', () => {
    // If either fell below 500, naive would simply not move, which reads as a
    // broken app rather than as a coarser algorithm — and proves nothing.
    expect(Math.abs(SOFT)).toBeGreaterThan(500);
    expect(Math.abs(HARD)).toBeGreaterThan(500);
  });
});

export type SpringConfig = {
  damping: number;
  stiffness: number;
  mass: number;
};

/**
 * The damping value at which a spring settles as fast as possible without
 * overshooting. Below this the spring bounces.
 *
 *   critical = 2 * sqrt(stiffness * mass)
 */
export function criticalDamping(stiffness: number, mass: number): number {
  return 2 * Math.sqrt(stiffness * mass);
}

export function isAtOrAboveCritical(spring: SpringConfig): boolean {
  return spring.damping >= criticalDamping(spring.stiffness, spring.mass);
}

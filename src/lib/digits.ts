export function formatDigits(value: number, decimals: number): string[] {
  return value
    .toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .split('');
}

/**
 * Roll direction follows value direction: digits roll up when the number rises
 * and down when it falls.
 *
 * Costs nothing, and it means a balance dropping after a commit is felt as a
 * descent rather than as a different number.
 */
export function rollDirection(from: number, to: number): 1 | -1 | 0 {
  if (to > from) return 1;
  if (to < from) return -1;
  return 0;
}

/** Round, readable ticks: 0.2, 0.5, 1, 2 or 5 kg apart, at most five of them. */
export function ticks(lo: number, hi: number): number[] {
  const span = Math.max(hi - lo, 0.4)
  const step = [0.2, 0.5, 1, 2, 5].find((s) => span / s <= 4) ?? 10
  let start = Math.floor(lo / step) * step
  let end = Math.ceil(hi / step) * step
  // Identical readings collapse to one tick, a zero-height axis, and NaN for
  // every coordinate. Open a step either side so a flat week draws flat.
  if (end - start < step / 2) {
    start -= step
    end += step
  }
  const out: number[] = []
  for (let v = start; v <= end + 1e-9; v += step) out.push(Math.round(v * 10) / 10)
  return out
}

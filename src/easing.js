/** Solve x(u) = time before evaluating y(u), as in CSS cubic-bezier. */
export function cubicBezier(time, points) {
  if (time <= 0) return 0;
  if (time >= 1) return 1;
  const [x1, y1, x2, y2] = points;
  const sample = (u, a, b) =>
    3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
  let low = 0,
    high = 1;
  for (let i = 0; i < 24; i++) {
    const u = (low + high) / 2;
    if (sample(u, x1, x2) < time) low = u;
    else high = u;
  }
  return sample((low + high) / 2, y1, y2);
}

export function motionProgress(time, config) {
  const progress = (time / config.duration) * config.speed;
  if (config.easingTarget !== "internal" && config.easingTarget !== "both")
    return progress;
  return Math.floor(progress) + cubicBezier(progress % 1, config.easing);
}

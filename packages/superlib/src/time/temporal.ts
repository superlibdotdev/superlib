export type DurationLike =
  | Omit<Temporal.DurationLike, "microseconds" | "nanoseconds">
  | Omit<Temporal.Duration, "microseconds" | "nanoseconds">

export function multiplyDuration(base: Temporal.Duration, factor: number): Temporal.Duration {
  return Temporal.Duration.from({
    years: Math.round(base.years * factor),
    months: Math.round(base.months * factor),
    weeks: Math.round(base.weeks * factor),
    days: Math.round(base.days * factor),
    hours: Math.round(base.hours * factor),
    minutes: Math.round(base.minutes * factor),
    seconds: Math.round(base.seconds * factor),
    milliseconds: Math.round(base.milliseconds * factor),
  })
}

export function durationToMs(duration: Temporal.Duration): number {
  const now = Temporal.Now.instant()
  const target = now.add(Temporal.Duration.from(duration))
  return target.epochMilliseconds - now.epochMilliseconds
}

export function prettyPrintDuration(duration: Temporal.Duration): string {
  return new (Intl as any).DurationFormat("en", { style: "narrow" }).format(duration) // @todo polyfill typings are off
}

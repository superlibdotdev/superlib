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
  // note: in node <= 22, Intl.DurationFormat is not available
  if (typeof (Intl as any).DurationFormat === "function") {
    return new (Intl as any).DurationFormat("en", { style: "narrow" }).format(duration)
  }

  const parts: string[] = []

  if (duration.years) parts.push(`${duration.years}y`)
  if (duration.months) parts.push(`${duration.months}mo`)
  if (duration.weeks) parts.push(`${duration.weeks}w`)
  if (duration.days) parts.push(`${duration.days}d`)
  if (duration.hours) parts.push(`${duration.hours}h`)
  if (duration.minutes) parts.push(`${duration.minutes}m`)
  if (duration.seconds) parts.push(`${duration.seconds}s`)
  if (duration.milliseconds) parts.push(`${duration.milliseconds}ms`)

  return parts.join(" ")
}

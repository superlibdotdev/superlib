import { durationToMs, type DurationLike } from "./index"

export function sleep(duration: DurationLike): Promise<void> {
  const ms = durationToMs(Temporal.Duration.from(duration))

  return new Promise<void>((r) => setTimeout(r, ms))
}

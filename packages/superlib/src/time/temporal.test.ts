import { describe, expect, it } from "bun:test"

import { durationToMs, prettyPrintDuration, multiplyDuration } from "./temporal"

describe(multiplyDuration.name, () => {
  it("scales the provided duration by a factor", () => {
    expect(multiplyDuration(Temporal.Duration.from({ milliseconds: 10 }), 3)).toEqual(
      Temporal.Duration.from({ milliseconds: 30 }),
    )
  })

  it("scales all duration fields", () => {
    const duration = Temporal.Duration.from({
      years: 1,
      months: 2,
      weeks: 3,
      days: 4,
      hours: 5,
      minutes: 6,
      seconds: 7,
      milliseconds: 250,
    })

    expect(multiplyDuration(duration, 2)).toEqual(
      Temporal.Duration.from({
        years: 2,
        months: 4,
        weeks: 6,
        days: 8,
        hours: 10,
        minutes: 12,
        seconds: 14,
        milliseconds: 500,
      }),
    )
  })

  it("scales all duration fields by a fractional factor", () => {
    const duration = Temporal.Duration.from({
      years: 10,
      months: 20,
      weeks: 30,
      days: 40,
      hours: 50,
      minutes: 60,
      seconds: 70,
      milliseconds: 900,
    })

    expect(multiplyDuration(duration, 0.3456)).toEqual(
      Temporal.Duration.from({
        years: 3,
        months: 7,
        weeks: 10,
        days: 14,
        hours: 17,
        minutes: 21,
        seconds: 24,
        milliseconds: 311,
      }),
    )
  })
})

describe(durationToMs.name, () => {
  it("returns milliseconds for a millisecond duration", () => {
    expect(durationToMs(Temporal.Duration.from({ milliseconds: 250 }))).toEqual(250)
  })

  it("sums mixed units", () => {
    expect(durationToMs(Temporal.Duration.from({ seconds: 1, milliseconds: 20 }))).toEqual(1020)
  })

  it("returns 0 for sub-ms durations", () => {
    expect(durationToMs(Temporal.Duration.from({ nanoseconds: 1 }))).toEqual(0)
    expect(durationToMs(Temporal.Duration.from({ microseconds: 1 }))).toEqual(0)
  })
})

describe(prettyPrintDuration.name, () => {
  it("formats seconds in narrow style", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ seconds: 2 }))).toEqual("2s")
  })

  it("formats mixed units in narrow style", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ minutes: 1, seconds: 30 }))).toEqual(
      "1m 30s",
    )
  })
})

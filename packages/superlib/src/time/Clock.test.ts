import { describe, expect, it } from "bun:test"

import { Clock, TestClock } from "./Clock"

describe(`${Clock.name}`, () => {
  it("returns a Temporal.Instant close to now", () => {
    const before = Date.now()
    const now = new Clock().now()
    const after = Date.now()

    expect(now.epochMilliseconds).toBeWithin(before, after + 5)
  })

  it("returns a Date close to now", () => {
    const before = Date.now()
    const now = new Clock().nowDate()
    const after = Date.now()

    expect(now).toBeInstanceOf(Date)
    expect(now.getTime()).toBeWithin(before, after + 5)
  })
})

describe(`${TestClock.name}`, () => {
  it("returns the provided instant", () => {
    const instant = Temporal.Instant.from("2020-01-01T00:00:00Z")
    const clock = new TestClock(instant)

    expect(clock.now()).toBe(instant)
  })

  it("advances time by the provided duration", () => {
    const instant = Temporal.Instant.from("2020-01-01T00:00:00Z")
    const clock = new TestClock(instant)

    clock.advance({ seconds: 30 })

    expect(clock.now().epochMilliseconds).toBe(instant.epochMilliseconds + 30_000)
  })

  it("resets time to the provided instant", () => {
    const instant = Temporal.Instant.from("2020-01-01T00:00:00Z")
    const resetInstant = Temporal.Instant.from("2020-01-02T12:34:56Z")
    const clock = new TestClock(instant)

    clock.reset(resetInstant)

    expect(clock.now()).toBe(resetInstant)
  })

  it("returns a Date matching the current instant", () => {
    const instant = Temporal.Instant.from("2020-01-01T00:00:00Z")
    const clock = new TestClock(instant)

    const nowDate = clock.nowDate()

    expect(nowDate.getTime()).toBe(instant.epochMilliseconds)
  })
})

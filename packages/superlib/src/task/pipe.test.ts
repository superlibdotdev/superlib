import { afterEach, beforeEach, describe, expect, it, jest, mock, vi } from "bun:test"

import { Err, Ok, Result } from "../basic"
import { sleep } from "../time"
import { Task } from "./index"

describe(Task.pipe.name, () => {
  let clock: typeof vi
  beforeEach(() => {
    clock = jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns the task result without steps", async () => {
    const task = mock(async () => {
      await sleep({ milliseconds: 5 })
      return "ok"
    })

    const result = Task.pipe(task)

    clock.advanceTimersByTime(5)

    expect(await result).toEqual("ok")
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("composes task-last mappers in order", async () => {
    const task = mock(async () => {
      await sleep({ milliseconds: 5 })
      return "Kris"
    })
    task.mockImplementationOnce(async (): Promise<string> => {
      await sleep({ milliseconds: 30 })
      return "Not Kris"
    })
    task.mockImplementationOnce(async (): Promise<string> => {
      await sleep({ milliseconds: 5 })
      throw new Error("boom")
    })

    const result = Task.pipe(
      task,
      Task.timeout({ timeout: { milliseconds: 20 } }),
      Task.retry({ times: 2, delay: () => ({ milliseconds: 5 }) }),
    )

    await (async (): Promise<void> => expect(task).toBeCalledTimes(1))()
    clock.advanceTimersByTime(20) // timeout
    clock.advanceTimersByTime(5) // retry delay

    await (async (): Promise<void> => expect(task).toBeCalledTimes(2))()
    clock.advanceTimersByTime(5) // sleep
    clock.advanceTimersByTime(5) // retry delay

    await (async (): Promise<void> => expect(task).toBeCalledTimes(3))()
    clock.advanceTimersByTime(5) // sleep

    expect(await result).toEqual("Kris")
  })

  it("composes task-last mappers in order using Results", async () => {
    type TaskResult = Result<string, { type: "not-kris" } | { type: "boom" }>
    const task = mock(async (): Promise<TaskResult> => {
      await sleep({ milliseconds: 5 })
      return Ok("Kris")
    })
    task.mockImplementationOnce(async (): Promise<TaskResult> => {
      await sleep({ milliseconds: 30 })
      return Err({ type: "not-kris" })
    })
    task.mockImplementationOnce(async (): Promise<TaskResult> => {
      await sleep({ milliseconds: 5 })
      return Err({ type: "boom" })
    })

    const result = Task.pipe(
      task,
      Task.timeout({ timeout: { milliseconds: 20 }, useResult: true }),
      Task.retry({ times: 2, delay: () => ({ milliseconds: 5 }) }),
    )

    await (async (): Promise<void> => expect(task).toBeCalledTimes(1))()
    clock.advanceTimersByTime(20) // timeout
    clock.advanceTimersByTime(5) // retry delay

    await (async (): Promise<void> => expect(task).toBeCalledTimes(2))()
    clock.advanceTimersByTime(5) // sleep
    clock.advanceTimersByTime(5) // retry delay

    await (async (): Promise<void> => expect(task).toBeCalledTimes(3))()
    clock.advanceTimersByTime(5) // sleep

    expect(await result).toEqual(Ok("Kris"))
  })

  it("maps numeric results through each stage", async () => {
    const task = mock(async () => 3)

    const result = Task.pipe(
      task,
      (input) => async (): Promise<number> => {
        const value = await input()
        return value * 2
      },
      (input) => async (): Promise<number> => {
        const value = await input()
        return value + 5
      },
      (input) => async (): Promise<number> => {
        const value = await input()
        return value - 4
      },
    )

    expect(await result).toEqual(7)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("works with mappers that are undefined", async () => {
    // mappers that can be undefined makes chaining optional mappers very easy
    const task = mock(async () => 3)

    const enabled = false

    const result = Task.pipe(
      task,
      (input) => async (): Promise<number> => {
        const value = await input()
        return value * 2
      },
      enabled
        ? (input) => async (): Promise<number> => {
            const value = await input()
            return value + 5
          }
        : undefined,
      enabled
        ? (input) => async (): Promise<number> => {
            const value = await input()
            return value - 4
          }
        : undefined,
    )

    expect(await result).toEqual(6)
    expect(task).toHaveBeenCalledTimes(1)
  })
})

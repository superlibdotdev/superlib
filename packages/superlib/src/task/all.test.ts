import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn, vi } from "bun:test"

import type { Task } from "./types"

import { sleep } from "../time/sleep"
import { all, allWithArray } from "./all"

describe(`${all.name}`, () => {
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

  describe("basics", () => {
    it("works with array", async () => {
      const tasks: Task<number>[] = [
        mock(async () => {
          await sleep({ milliseconds: 10 })
          return 1
        }),
        mock(async () => {
          await sleep({ milliseconds: 5 })
          return 2
        }),
      ]

      const res = all(tasks, { concurrency: 2 })

      expect(tasks[0]).toBeCalledTimes(1)
      expect(tasks[1]).toBeCalledTimes(1)

      clock.advanceTimersByTime(10)

      expect(await res).toEqual([1, 2])
    })

    it("works with objects", async () => {
      const tasks = {
        fast: mock(async () => {
          await sleep({ milliseconds: 5 })
          return "fast"
        }),
        slow: mock(async () => {
          await sleep({ milliseconds: 10 })
          return "slow"
        }),
      } satisfies Record<string, Task<string>>

      const res = all(tasks, { concurrency: 2 })

      expect(tasks.fast).toBeCalledTimes(1)
      expect(tasks.slow).toBeCalledTimes(1)

      clock.advanceTimersByTime(10)

      expect(await res).toEqual({ fast: "fast", slow: "slow" })
    })
  })

  describe(`${allWithArray.name} with concurrency as number`, () => {
    describe("basic behaviour", () => {
      it("runs all tasks and resolves results in input order", async () => {
        const finished: number[] = []

        const tasks: Task<number>[] = [
          mock(async () => {
            await sleep({ milliseconds: 30 })
            finished.push(0)
            return 0
          }),
          mock(async () => {
            await sleep({ milliseconds: 5 })
            finished.push(1)
            return 1
          }),
          mock(async () => {
            await sleep({ milliseconds: 15 })
            finished.push(2)
            return 2
          }),
        ]

        const res = allWithArray(tasks, { concurrency: 2 })

        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(0)
        expect(finished).toEqual([])

        clock.advanceTimersByTime(5)
        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(1)
        expect(finished).toEqual([1])

        clock.advanceTimersByTime(15)
        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(1)
        expect(finished).toEqual([1, 2])

        clock.advanceTimersByTime(10)
        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(1)
        expect(finished).toEqual([1, 2, 0])

        expect(await res).toEqual([0, 1, 2])
      })

      it("resolves empty array when given no tasks", async () => {
        const res = await allWithArray<number>([], { concurrency: 5 })

        expect(res).toEqual([])
      })

      it("handles single task correctly", async () => {
        const tasks: Task<string>[] = [async () => "ok"]
        const res = await allWithArray(tasks, { concurrency: 5 })

        expect(res).toEqual(["ok"])
      })

      it("handles concurrency equal to task count", async () => {
        const tasks: Task<number>[] = [
          async () => {
            return 0
          },
          async () => {
            return 1
          },
          async () => {
            return 2
          },
        ]

        const res = await allWithArray(tasks, { concurrency: tasks.length })

        expect(res).toEqual([0, 1, 2])
      })

      it("handles concurrency greater than task count", async () => {
        const tasks: Task<number>[] = [
          async () => {
            return 0
          },
          async () => {
            return 1
          },
          async () => {
            return 2
          },
        ]

        const res = await allWithArray(tasks, { concurrency: 999 })

        expect(res).toEqual([0, 1, 2])
      })

      it("when passed concurrency = Infinite+ treat it as unbounded", async () => {
        const promiseAllSpy = spyOn(Promise, "all")

        const tasks: Task<number>[] = [
          async (): Promise<number> => {
            return 1
          },
          async (): Promise<number> => {
            return 2
          },
        ]

        const res = await allWithArray(tasks, { concurrency: Number.POSITIVE_INFINITY })

        expect(res).toEqual([1, 2])
        expect(promiseAllSpy).toHaveBeenCalledTimes(1)
      })
    })

    describe("error handling", () => {
      it("throws on invalid concurrency values", () => {
        expect(() => allWithArray([], { concurrency: 0 })).toThrow(
          "options.concurrency must be a positive integer",
        )
        expect(() => allWithArray([], { concurrency: -1 })).toThrow(
          "options.concurrency must be a positive integer",
        )
        expect(() => allWithArray([], { concurrency: Number.NaN })).toThrow(
          "options.concurrency must be a positive integer",
        )
        expect(() => allWithArray([], { concurrency: 5.5 })).toThrow(
          "options.concurrency must be a positive integer",
        )
      })

      it("rejects immediately when the first task rejects", async () => {
        const error = new Error("boom")

        const tasks: Task<number>[] = [
          mock(async () => {
            await sleep({ milliseconds: 5 })
            throw error
          }),
          mock(async () => {
            return 1
          }),
        ]

        const res = allWithArray(tasks, { concurrency: 1 })
        clock.advanceTimersToNextTimer()

        expect(res).rejects.toBe(error)
        expect(tasks[0]).toHaveBeenCalledTimes(1)
        expect(tasks[1]).toHaveBeenCalledTimes(0)
      })

      it("allows already-running tasks to finish after rejection", async () => {
        const error = new Error("nope")
        let runningFinished = false
        const { promise: finishPromise, resolve: allowFinish } = Promise.withResolvers()

        const tasks: Task<number>[] = [
          async () => {
            await sleep({ milliseconds: 5 })
            throw error
          },
          async () => {
            await finishPromise
            runningFinished = true
            return 42
          },
        ]

        const res = allWithArray(tasks, { concurrency: 2 })
        clock.advanceTimersToNextTimer()

        expect(res).rejects.toBe(error)
        expect(runningFinished).toBe(false)

        allowFinish()
        await finishPromise

        expect(runningFinished).toBe(true)
      })
    })
  })

  describe(`${allWithArray.name} with "unbounded" concurrency`, () => {
    it("executes all tasks at the same time", async () => {
      const { promise: gate, resolve: openGate } = Promise.withResolvers<void>()
      const total = 5
      let active = 0
      let maxActive = 0

      const tasks: Task<number>[] = Array.from({ length: total }, (_, i) => {
        return async () => {
          active += 1
          maxActive = Math.max(maxActive, active)
          await gate
          active -= 1
          return i
        }
      })

      const res = allWithArray(tasks, { concurrency: "unbounded" })

      expect(maxActive).toBe(total)

      openGate()
      expect(await res).toEqual([0, 1, 2, 3, 4])
    })

    it("uses Promise.all under the hood", async () => {
      const promiseAllSpy = spyOn(Promise, "all")

      const r = await allWithArray(
        [
          async (): Promise<number> => {
            return 1
          },
          async (): Promise<number> => {
            return 2
          },
        ],
        { concurrency: "unbounded" },
      )
      expect(r).toEqual([1, 2])
      expect(promiseAllSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe(`${allWithArray.name} with "batches-of-{number}" concurrency`, () => {
    describe("basic behaviour", () => {
      it("processes in batches", async () => {
        const finished: number[] = []

        const tasks: Task<number>[] = [
          mock(async () => {
            await sleep({ milliseconds: 30 })
            finished.push(0)
            return 0
          }),
          mock(async () => {
            await sleep({ milliseconds: 5 })
            finished.push(1)
            return 1
          }),
          mock(async () => {
            await sleep({ milliseconds: 15 })
            finished.push(2)
            return 2
          }),
        ]

        const res = allWithArray(tasks, { concurrency: "batches-of-2" })

        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(0)
        expect(finished).toEqual([])

        clock.advanceTimersByTime(5)
        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(0) // not called until the whole batch finishes
        expect(finished).toEqual([1])

        clock.advanceTimersByTime(25)
        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(1)
        expect(finished).toEqual([1, 0])

        clock.advanceTimersByTime(15)
        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(1)
        expect(finished).toEqual([1, 0, 2])

        expect(await res).toEqual([0, 1, 2])
      })

      it("uses Promise.all under the hood", async () => {
        const promiseAllSpy = spyOn(Promise, "all")

        const res = await allWithArray(
          [
            async (): Promise<number> => {
              return 1
            },
            async (): Promise<number> => {
              return 2
            },
            async (): Promise<number> => {
              return 3
            },
          ],
          { concurrency: "batches-of-2" },
        )

        expect(res).toEqual([1, 2, 3])
        expect(promiseAllSpy).toHaveBeenCalledTimes(2)
      })
      it("works when batch size equals number of tasks", async () => {
        const tasks: Task<number>[] = [
          async () => {
            return 0
          },
          async () => {
            return 1
          },
          async () => {
            return 2
          },
        ]

        const res = await allWithArray(tasks, { concurrency: "batches-of-3" })

        expect(res).toEqual([0, 1, 2])
      })
      it("works when batch size is 1", async () => {
        const finished: number[] = []

        const tasks: Task<number>[] = [
          mock(async () => {
            await sleep({ milliseconds: 5 })
            finished.push(0)
            return 0
          }),
          mock(async () => {
            await sleep({ milliseconds: 5 })
            finished.push(1)
            return 1
          }),
          mock(async () => {
            await sleep({ milliseconds: 5 })
            finished.push(2)
            return 2
          }),
        ]

        const res = allWithArray(tasks, { concurrency: "batches-of-1" })

        expect(tasks[0]).toBeCalledTimes(1)
        expect(tasks[1]).toBeCalledTimes(0)
        expect(tasks[2]).toBeCalledTimes(0)
        expect(finished).toEqual([])

        clock.advanceTimersByTime(5)
        expect(tasks[1]).toBeCalledTimes(1)
        expect(tasks[2]).toBeCalledTimes(0)
        expect(finished).toEqual([0])

        clock.advanceTimersByTime(5)
        expect(tasks[2]).toBeCalledTimes(1)
        expect(finished).toEqual([0, 1])

        clock.advanceTimersByTime(5)
        expect(finished).toEqual([0, 1, 2])

        expect(await res).toEqual([0, 1, 2])
      })
    })

    describe("error handling", () => {
      it("throws on invalid batch size values", () => {
        expect(() => allWithArray([], { concurrency: "batches-of-0" })).toThrow(
          "options.concurrency must be a positive integer",
        )
        expect(() => allWithArray([], { concurrency: "batches-of--1" })).toThrow(
          "options.concurrency must be a positive integer",
        )
        expect(() => allWithArray([], { concurrency: "batches-of-NaN" as any })).toThrow(
          "options.concurrency must be a positive integer",
        )
        expect(() => allWithArray([], { concurrency: "batches-of-5.5" })).toThrow(
          "options.concurrency must be a positive integer",
        )
      })

      it("rejects immediately when the first task in a batch rejects", async () => {
        const error = new Error("boom")

        const tasks: Task<number>[] = [
          mock(async () => {
            await sleep({ milliseconds: 5 })
            throw error
          }),
          mock(async () => {
            return 1
          }),
          mock(async () => {
            return 2
          }),
        ]

        const res = allWithArray(tasks, { concurrency: "batches-of-2" })
        clock.advanceTimersToNextTimer()

        expect(res).rejects.toBe(error)
        expect(tasks[0]).toHaveBeenCalledTimes(1)
        expect(tasks[1]).toHaveBeenCalledTimes(1)
        expect(tasks[2]).toHaveBeenCalledTimes(0)
      })
    })
  })
})

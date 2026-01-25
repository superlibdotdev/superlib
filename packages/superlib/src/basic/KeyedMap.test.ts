import { describe, expect, it } from "bun:test"

import { KeyedMap } from "./KeyedMap"

interface Point {
  x: number
  y: number
}

const serializePoint = (p: Point): string => `${p.x},${p.y}`

describe(KeyedMap.name, () => {
  describe("basic operations", () => {
    it("stores and retrieves values by key", () => {
      const map = new KeyedMap<Point, string>(serializePoint)

      map.set({ x: 1, y: 2 }, "value1")

      expect(map.get({ x: 1, y: 2 })).toBe("value1")
    })

    it("returns undefined for missing keys", () => {
      const map = new KeyedMap<Point, string>(serializePoint)

      expect(map.get({ x: 1, y: 2 })).toBeUndefined()
    })

    it("overwrites existing values", () => {
      const map = new KeyedMap<Point, string>(serializePoint)

      map.set({ x: 1, y: 2 }, "original")
      map.set({ x: 1, y: 2 }, "updated")

      expect(map.get({ x: 1, y: 2 })).toBe("updated")
    })

    it("returns this from set for chaining", () => {
      const map = new KeyedMap<Point, string>(serializePoint)

      const result = map.set({ x: 1, y: 2 }, "value")

      expect(result).toBe(map)
    })
  })

  describe(KeyedMap.prototype.has.name, () => {
    it("returns true when key exists", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      map.set({ x: 1, y: 2 }, "value")

      expect(map.has({ x: 1, y: 2 })).toBe(true)
    })

    it("returns false when key does not exist", () => {
      const map = new KeyedMap<Point, string>(serializePoint)

      expect(map.has({ x: 1, y: 2 })).toBe(false)
    })
  })

  describe(KeyedMap.prototype.delete.name, () => {
    it("removes entry and returns true when key exists", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      map.set({ x: 1, y: 2 }, "value")

      const result = map.delete({ x: 1, y: 2 })

      expect(result).toBe(true)
      expect(map.has({ x: 1, y: 2 })).toBe(false)
    })

    it("returns false when key does not exist", () => {
      const map = new KeyedMap<Point, string>(serializePoint)

      const result = map.delete({ x: 1, y: 2 })

      expect(result).toBe(false)
    })
  })

  describe(KeyedMap.prototype.clear.name, () => {
    it("removes all entries", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      map.set({ x: 1, y: 2 }, "value1")
      map.set({ x: 3, y: 4 }, "value2")

      map.clear()

      expect(map.size).toBe(0)
      expect(map.has({ x: 1, y: 2 })).toBe(false)
      expect(map.has({ x: 3, y: 4 })).toBe(false)
    })
  })

  describe("size", () => {
    it("returns 0 for empty map", () => {
      const map = new KeyedMap<Point, string>(serializePoint)

      expect(map.size).toBe(0)
    })

    it("returns correct count of entries", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      map.set({ x: 1, y: 2 }, "value1")
      map.set({ x: 3, y: 4 }, "value2")

      expect(map.size).toBe(2)
    })

    it("does not double count overwritten entries", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      map.set({ x: 1, y: 2 }, "original")
      map.set({ x: 1, y: 2 }, "updated")

      expect(map.size).toBe(1)
    })
  })

  describe(KeyedMap.prototype.keys.name, () => {
    it("iterates over original keys", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      const point1 = { x: 1, y: 2 }
      const point2 = { x: 3, y: 4 }
      map.set(point1, "value1")
      map.set(point2, "value2")

      const keys = Array.from(map.keys())

      expect(keys).toHaveLength(2)
      expect(keys).toContainEqual(point1)
      expect(keys).toContainEqual(point2)
    })
  })

  describe(KeyedMap.prototype.values.name, () => {
    it("iterates over values", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      map.set({ x: 1, y: 2 }, "value1")
      map.set({ x: 3, y: 4 }, "value2")

      const values = Array.from(map.values())

      expect(values).toHaveLength(2)
      expect(values).toContain("value1")
      expect(values).toContain("value2")
    })
  })

  describe(KeyedMap.prototype.entries.name, () => {
    it("iterates over key-value pairs", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      const point1 = { x: 1, y: 2 }
      const point2 = { x: 3, y: 4 }
      map.set(point1, "value1")
      map.set(point2, "value2")

      const entries = Array.from(map.entries())

      expect(entries).toHaveLength(2)
      expect(entries).toContainEqual([point1, "value1"])
      expect(entries).toContainEqual([point2, "value2"])
    })
  })

  describe(Symbol.iterator.toString(), () => {
    it("allows for-of iteration", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      const point1 = { x: 1, y: 2 }
      map.set(point1, "value1")

      const entries: [Point, string][] = []
      for (const entry of map) {
        entries.push(entry)
      }

      expect(entries).toEqual([[point1, "value1"]])
    })
  })

  describe(KeyedMap.prototype.forEach.name, () => {
    it("calls callback for each entry", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      const point1 = { x: 1, y: 2 }
      const point2 = { x: 3, y: 4 }
      map.set(point1, "value1")
      map.set(point2, "value2")

      const collected: [string, Point][] = []
      map.forEach((value, key) => {
        collected.push([value, key])
      })

      expect(collected).toHaveLength(2)
      expect(collected).toContainEqual(["value1", point1])
      expect(collected).toContainEqual(["value2", point2])
    })

    it("passes map as third argument", () => {
      const map = new KeyedMap<Point, string>(serializePoint)
      map.set({ x: 1, y: 2 }, "value1")

      map.forEach((_value, _key, m) => {
        expect(m).toBe(map)
      })
    })
  })
})

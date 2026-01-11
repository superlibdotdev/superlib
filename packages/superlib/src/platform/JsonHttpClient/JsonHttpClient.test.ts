import { describe, expect, it, mock } from "bun:test"
import { z } from "zod"

import type { SafeFetchResult } from "../safeFetch"

import { Err, Ok } from "../../basic"
import { JsonHttpClient } from "./JsonHttpClient"

describe(JsonHttpClient.name, () => {
  describe(JsonHttpClient.prototype.get.name, () => {
    it("returns Ok when response JSON matches schema", async () => {
      const safeFetch = mock(async () =>
        Ok(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
      )
      const client = new JsonHttpClient(safeFetch)
      const schema = z.object({ name: z.string() })

      const result = await client.get("https://example.com", schema)

      expect(result).toEqual(Ok({ name: "Ada" }))
      expect(safeFetch).toHaveBeenCalledTimes(1)
    })

    it("returns Err when safeFetch returns http error", async () => {
      const safeFetch = mock(
        async (): Promise<SafeFetchResult> => Err({ type: "fetch/http", status: 500 }),
      )
      const client = new JsonHttpClient(safeFetch)
      const schema = z.object({ name: z.string() })

      const result = await client.get("https://example.com", schema)

      expect(result).toEqual(Err({ type: "fetch/http", status: 500 }))
      expect(safeFetch).toHaveBeenCalledTimes(1)
    })

    it("returns Err when JSON parsing fails", async () => {
      const safeFetch = mock(async () => Ok(new Response("{", { status: 200 })))
      const client = new JsonHttpClient(safeFetch)
      const schema = z.object({ name: z.string() })

      const result = await client.get("https://example.com", schema)

      expect(result).toEqual(
        Err({
          type: "jsonHttpClient/json-parse",
          cause: expect.anything(),
        }),
      )
      expect(safeFetch).toHaveBeenCalledTimes(1)
    })

    it("returns Err when schema validation fails", async () => {
      const safeFetch = mock(async () =>
        Ok(new Response(JSON.stringify({ name: 123 }), { status: 200 })),
      )
      const client = new JsonHttpClient(safeFetch)
      const schema = z.object({ name: z.string() })

      const result = await client.get("https://example.com", schema)

      expect(result).toEqual(
        Err({
          type: "schema/validate",
          issue: expect.anything(),
        }),
      )
      expect(safeFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe(JsonHttpClient.prototype.post.name, () => {
    it("passes JSON body and returns Ok when response matches schema", async () => {
      const safeFetch = mock(async () =>
        Ok(new Response(JSON.stringify({ id: 123 }), { status: 200 })),
      )
      const client = new JsonHttpClient(safeFetch)
      const schema = z.object({ id: z.number() })
      const body = { name: "Ada" }

      const result = await client.post("https://example.com", body, schema)

      expect(result).toEqual(Ok({ id: 123 }))
      expect(safeFetch).toHaveBeenCalledTimes(1)
      expect(safeFetch.mock.calls[0]!).toEqual([
        "https://example.com",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      ] as any)
    })
  })

  describe.only(JsonHttpClient.prototype.patch.name, () => {
    it("passes JSON body and returns Ok when response matches schema", async () => {
      const safeFetch = mock(async () =>
        Ok(new Response(JSON.stringify({ updated: true }), { status: 200 })),
      )
      const client = new JsonHttpClient(safeFetch)
      const schema = z.object({ updated: z.boolean() })
      const body = { name: "Ada" }

      const result = await client.patch("https://example.com", body, schema)

      expect(result).toEqual(Ok({ updated: true }))
      expect(safeFetch).toHaveBeenCalledTimes(1)
      expect(safeFetch.mock.calls[0]!).toEqual([
        "https://example.com",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      ] as any)
    })
  })

  describe(JsonHttpClient.prototype.delete.name, () => {
    it("passes delete method and returns Ok when response matches schema", async () => {
      const safeFetch = mock(async () =>
        Ok(new Response(JSON.stringify({ removed: true }), { status: 200 })),
      )
      const client = new JsonHttpClient(safeFetch)
      const schema = z.object({ removed: z.boolean() })

      const result = await client.delete("https://example.com", schema)

      expect(result).toEqual(Ok({ removed: true }))
      expect(safeFetch).toHaveBeenCalledTimes(1)
      expect(safeFetch.mock.calls[0]!).toEqual(["https://example.com", { method: "DELETE" }] as any)
    })
  })
})

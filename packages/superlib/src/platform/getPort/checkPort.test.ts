import { afterEach, describe, expect, it } from "bun:test"
import { createServer, type Server } from "node:net"

import { checkPort } from "./checkPort"

describe(checkPort.name, () => {
  let server: Server | null = null

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve())
      })
      server = null
    }
  })

  it("returns true for available port", async () => {
    const port = 18200

    const result = await checkPort(port)

    expect(result).toBeTrue()
  })

  it("returns false when IPv4 port is busy", async () => {
    const port = 18201
    server = createServer()
    server.unref()
    await new Promise<void>((resolve) => {
      server!.listen(port, "127.0.0.1", () => resolve())
    })

    const result = await checkPort(port)

    expect(result).toBeFalse()
  })

  it("returns false when IPv6 port is busy", async () => {
    const port = 18202
    server = createServer()
    server.unref()
    await new Promise<void>((resolve) => {
      server!.listen(port, "::1", () => resolve())
    })

    const result = await checkPort(port)

    expect(result).toBeFalse()
  })
})

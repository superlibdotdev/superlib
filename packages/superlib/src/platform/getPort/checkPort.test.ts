import { describe, expect, it } from "bun:test"
import { createServer } from "node:net"

import { checkPort } from "./checkPort"

// todo: this test is broken. FIX
describe.skip(checkPort.name, () => {
  it("marks busy port as busy", (done) => {
    const port = 8123
    const server = createServer()
    server.unref()

    server.listen(port, "localhost", async () => {
      const r = await checkPort(port)

      expect(r).toBeFalse()
      done()
    })
  })
})

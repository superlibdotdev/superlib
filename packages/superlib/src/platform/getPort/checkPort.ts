import { createServer } from "node:net"

export function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const server = createServer()
      server.unref()

      server.on("error", () => {
        resolve(false)
      })

      server.listen(port, "localhost", () => {
        server.close(() => {
          resolve(true)
        })
      })
    } catch {
      resolve(false)
    }
  })
}

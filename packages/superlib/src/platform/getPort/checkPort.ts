import { createServer } from "node:net"
import { networkInterfaces } from "node:os"

export async function checkPort(port: number): Promise<boolean> {
  const hosts = getLocalHosts()

  for (const host of hosts) {
    const available = await checkPortOnHost(port, host)
    if (!available) {
      return false
    }
  }

  return true
}

function getLocalHosts(): Set<string | undefined> {
  const interfaces = networkInterfaces()
  const hosts = new Set<string | undefined>([undefined, "0.0.0.0"])

  for (const networkInterface of Object.values(interfaces)) {
    if (networkInterface) {
      for (const config of networkInterface) {
        hosts.add(config.address)
      }
    }
  }

  return hosts
}

function checkPortOnHost(port: number, host: string | undefined): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const server = createServer()
      server.unref()

      server.on("error", (error: NodeJS.ErrnoException) => {
        // EADDRNOTAVAIL/EINVAL: host doesn't support binding, skip it
        if (error.code === "EADDRNOTAVAIL" || error.code === "EINVAL") {
          resolve(true)
        } else {
          resolve(false)
        }
      })

      server.listen(port, host, () => {
        server.close(() => {
          resolve(true)
        })
      })
    } catch {
      resolve(false)
    }
  })
}

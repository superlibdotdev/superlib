import { RealRandom, type IRandom } from "../../random"
import { checkPort } from "./checkPort"

interface GetPortDependencies {
  random: IRandom
  checkPort: (port: number) => Promise<boolean>
  // @todo another dependency could be a shared ExpiryMap that would prevent port collisions in the same process
}

export async function getPort(
  dependencies: GetPortDependencies = { random: new RealRandom(), checkPort },
): Promise<number> {
  while (true) {
    const port = dependencies.random.nextInteger(LOW_PORT, HIGH_PORT)

    const isAvailable = await dependencies.checkPort(port)

    if (isAvailable) {
      return port
    }
  }
}

const LOW_PORT = 49152
const HIGH_PORT = 65535

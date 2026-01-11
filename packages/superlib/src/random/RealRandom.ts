import { AbstractRandom } from "./Random"

export class RealRandom extends AbstractRandom {
  next(): number {
    return Math.random()
  }
}

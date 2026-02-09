import type { LogEntry, LogFormatter } from "./types"

import { jsonStringifyAll } from "../utils/jsonStringifyAll"

export class LogFormatterJson implements LogFormatter {
  format(entry: LogEntry): string {
    const core = {
      time: entry.time.toISOString(),
      level: entry.level,
      service: entry.service,
      message: entry.message,
      error: entry.resolvedError,
    }

    try {
      return jsonStringifyAll({ ...core, parameters: entry.parameters })
    } catch {
      return jsonStringifyAll({ ...core })
    }
  }
}

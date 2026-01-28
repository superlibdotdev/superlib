function color(code: number) {
  const open = `\x1b[${code}m`
  const close = "\x1b[0m"
  return (text: string) => open + text.replaceAll("\n", `${close}\n${open}`) + close
}

export const ansiColors = {
  red: color(31),
  green: color(32),
  yellow: color(33),
  blue: color(34),
  magenta: color(35),
  cyan: color(36),
  gray: color(90),
  bold: color(1),
}

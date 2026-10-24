import { change } from "@/lib/metrics"

export const num = (n: number) => n.toLocaleString("ja-JP")
export const yen = (n: number) =>
  n.toLocaleString("ja-JP", { style: "currency", currency: "JPY" })
export const pct = (r: number) => `${r > 0 ? "+" : ""}${(r * 100).toFixed(1)}%`

/**
 * Arrow follows the value's direction; color follows good/bad.
 * `diff` shows the absolute difference (e.g. search position), `invert` = lower is better.
 */
export const Delta = ({
  current,
  previous,
  diff = false,
  invert = false,
}: {
  current: number
  previous: number
  diff?: boolean
  invert?: boolean
}) => {
  const r = diff ? current - previous : change(current, previous)
  if (r === null) return <span className="text-zinc-400">—</span>
  // Below display precision → neutral, so "-0.0%" never shows up red
  if (Math.abs(r) < (diff ? 0.05 : 0.0005))
    return <span className="text-zinc-400 tabular-nums">±0</span>
  const up = r >= 0
  return (
    <span
      className="tabular-nums font-medium"
      style={{ color: up !== invert ? "var(--good)" : "var(--critical)" }}
    >
      {up ? "▲" : "▼"} {diff ? `${up ? "+" : ""}${r.toFixed(1)}` : pct(r)}
    </span>
  )
}

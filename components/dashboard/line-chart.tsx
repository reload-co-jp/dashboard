"use client"
import { useState } from "react"
import { num } from "./format"

const W = 800
const H = 240
const PAD = { top: 12, right: 12, bottom: 24, left: 56 }

type Props = {
  dates: string[]
  series: number[]
  prevSeries: number[]
  label: string
  fmt?: (n: number) => string
}

/** Current period (solid) vs previous period (dashed), aligned by day index. */
export const LineChart = ({
  dates,
  series,
  prevSeries,
  label,
  fmt = num,
}: Props) => {
  const [hover, setHover] = useState<number | null>(null)
  const n = series.length
  // 4 gridlines at a "nice" step (1/2/2.5/5 × 10^n)
  const raw = Math.max(...series, ...prevSeries, 1) / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag
  const max = step * 4
  const x = (i: number) =>
    PAD.left + (n > 1 ? (i / (n - 1)) * (W - PAD.left - PAD.right) : 0)
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom)
  const path = (vs: number[]) =>
    vs.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("")
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)
  const xLabels = [0, Math.floor((n - 1) / 2), n - 1]

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(
      ((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1)
    )
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <figure className="relative">
      <figcaption className="mb-2 flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4"
            style={{ background: "var(--series-1)" }}
          />
          {label}（今期間）
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 border-t-2 border-dashed"
            style={{ borderColor: "var(--series-prev)" }}
          />
          前期間
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`${label}推移`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-zinc-500 text-[11px]"
            >
              {fmt(t)}
            </text>
          </g>
        ))}
        {xLabels.map((i, k) => (
          <text
            key={k}
            x={x(i)}
            y={H - 6}
            textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
            className="fill-zinc-500 text-[11px]"
          >
            {dates[i]?.slice(5).replace("-", "/")}
          </text>
        ))}
        <path
          d={path(prevSeries)}
          fill="none"
          stroke="var(--series-prev)"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
        <path
          d={path(series)}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className="stroke-zinc-400 dark:stroke-zinc-600"
            />
            <circle
              cx={x(hover)}
              cy={y(series[hover])}
              r={4}
              fill="var(--series-1)"
              className="stroke-white dark:stroke-zinc-900"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-8 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform:
              hover > n / 2
                ? "translateX(calc(-100% - 12px))"
                : "translateX(12px)",
          }}
        >
          <div className="mb-1 text-zinc-500">{dates[hover]}</div>
          <div className="tabular-nums">
            {label} <b>{fmt(series[hover])}</b>
          </div>
          {prevSeries[hover] !== undefined && (
            <div className="tabular-nums text-zinc-500">
              前期間 {fmt(prevSeries[hover])}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}

export const Sparkline = ({ values }: { values: number[] }) => {
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const d = values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${(i / Math.max(values.length - 1, 1)) * 96 + 2},${22 - ((v - min) / (max - min || 1)) * 20}`
    )
    .join("")
  return (
    <svg viewBox="0 0 100 24" className="h-6 w-24" aria-hidden>
      <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={1.5} />
    </svg>
  )
}

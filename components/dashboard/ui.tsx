import { ReactNode } from "react"
import { Delta } from "./format"

export const card =
  "rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"

export const Card = ({
  title,
  action,
  className = "",
  children,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <section className={`${card} ${className}`}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-medium">{title}</h3>
      {action}
    </div>
    {children}
  </section>
)

export const Kpi = ({
  label,
  value,
  current,
  previous,
  diff,
  invert,
}: {
  label: string
  value: string
  current: number
  previous: number
  diff?: boolean
  invert?: boolean
}) => (
  <div className={card}>
    <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
    <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    <div className="mt-1 text-sm">
      <Delta
        current={current}
        previous={previous}
        diff={diff}
        invert={invert}
      />
    </div>
  </div>
)

export const Segmented = <T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly (readonly [T, string])[]
  value: T
  onChange: (v: T) => void
}) => (
  <div
    role="group"
    aria-label={label}
    className="flex flex-wrap rounded-md border border-zinc-200 p-0.5 text-sm dark:border-zinc-800"
  >
    {options.map(([v, text]) => (
      <button
        key={v}
        type="button"
        aria-pressed={v === value}
        onClick={() => onChange(v)}
        className="rounded px-3 py-1 text-zinc-600 aria-pressed:bg-zinc-900 aria-pressed:text-white dark:text-zinc-400 dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-900"
      >
        {text}
      </button>
    ))}
  </div>
)

export const th = "py-2 pr-4 font-normal"
export const td = "py-2 pr-4"
export const tr =
  "border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"

export const Table = ({
  head,
  children,
}: {
  head: ReactNode
  children: ReactNode
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-zinc-500">
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          {head}
        </tr>
      </thead>
      <tbody className="tabular-nums">{children}</tbody>
    </table>
  </div>
)

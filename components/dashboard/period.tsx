"use client"
import { ReactNode, createContext, useContext, useState } from "react"
import { PERIODS, Period } from "@/lib/metrics"
import { Segmented } from "./ui"

const Ctx = createContext<[Period, (p: Period) => void]>([30, () => {}])

/** Shared across pages: lives in the root layout, so it survives client-side navigation. */
export const PeriodProvider = ({ children }: { children: ReactNode }) => (
  <Ctx.Provider value={useState<Period>(30)}>{children}</Ctx.Provider>
)

export const usePeriod = () => useContext(Ctx)[0]

export const PeriodToggle = () => {
  const [period, setPeriod] = useContext(Ctx)
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-zinc-500 sm:inline">前{period}日と比較</span>
      <Segmented<Period>
        label="期間"
        options={PERIODS.map((p) => [p, `${p}日`] as const)}
        value={period}
        onChange={setPeriod}
      />
    </div>
  )
}

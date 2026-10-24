"use client"
import Link from "next/link"
import { Metrics, Period, SiteRow, View, change } from "@/lib/metrics"
import { Delta, num, pct, yen } from "./format"
import { LineChart, Sparkline } from "./line-chart"
import { usePeriod } from "./period"
import { Card, Kpi, Table, td, th, tr } from "./ui"

export const KPIS: {
  key: keyof Metrics
  label: string
  fmt: (n: number) => string
}[] = [
  { key: "pv", label: "PV", fmt: num },
  { key: "users", label: "Users", fmt: num },
  { key: "sessions", label: "Sessions", fmt: num },
  { key: "organicUsers", label: "Organic Users", fmt: num },
  { key: "revenue", label: "収益", fmt: yen },
]

// ponytail: fixed thresholds; move to sites.json if per-site tuning is needed
const attentionReasons = (r: SiteRow) =>
  (
    [
      [change(r.current.pv, r.previous.pv), -0.05, "PV"],
      [
        change(r.current.organicUsers, r.previous.organicUsers),
        -0.1,
        "Organic",
      ],
      [change(r.current.revenue, r.previous.revenue), -0.1, "収益"],
    ] as const
  )
    .filter(([c, th]) => c !== null && c <= th)
    .map(([c, , label]) => `${label} ${pct(c)}`)

export const Dashboard = ({ views }: { views: Record<Period, View> }) => {
  const v = views[usePeriod()]
  const totalPv = v.current.pv || 1
  const rising = v.rows
    .map((r) => ({ r, c: change(r.current.pv, r.previous.pv) ?? 0 }))
    .filter(({ c }) => c >= 0.05)
    .sort((a, b) => b.c - a.c)
    .slice(0, 3)
  const attention = v.rows
    .map((r) => ({ r, reasons: attentionReasons(r) }))
    .filter(({ reasons }) => reasons.length)

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">概要</h2>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.filter((k) => k.key !== "sessions").map(({ key, label, fmt }) => (
          <Kpi
            key={key}
            label={label}
            value={fmt(v.current[key])}
            current={v.current[key]}
            previous={v.previous[key]}
          />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="全サイト トラフィック推移" className="lg:col-span-2">
          <LineChart
            dates={v.daily.map((d) => d.date)}
            series={v.daily.map((d) => d.pv)}
            prevSeries={v.prevDaily.map((d) => d.pv)}
            label="PV"
          />
        </Card>
        <div className="grid gap-4">
          <Card title="伸びているサイト">
            <ul className="space-y-2 text-sm">
              {rising.map(({ r }) => (
                <li key={r.id} className="flex justify-between">
                  <Link href={`/sites/${r.id}/`} className="hover:underline">
                    {r.name}
                  </Link>
                  <Delta current={r.current.pv} previous={r.previous.pv} />
                </li>
              ))}
              {!rising.length && <li className="text-zinc-500">該当なし</li>}
            </ul>
          </Card>
          <Card title="注意が必要なサイト">
            <ul className="space-y-2 text-sm">
              {attention.map(({ r, reasons }) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <Link href={`/sites/${r.id}/`} className="hover:underline">
                    ⚠ {r.name}
                  </Link>
                  <span
                    className="text-right tabular-nums"
                    style={{ color: "var(--critical)" }}
                  >
                    {reasons.join(" / ")}
                  </span>
                </li>
              ))}
              {!attention.length && <li className="text-zinc-500">該当なし</li>}
            </ul>
          </Card>
        </div>
      </div>

      <Card title="サイト別ランキング">
        <Table
          head={
            <>
              <th className="py-2 pr-2 font-normal">#</th>
              <th className={th}>サイト</th>
              <th className={`${th} text-right`}>PV</th>
              <th className={th}>シェア</th>
              <th className={`${th} text-right`}>前期間比</th>
              <th className={`${th} text-right`}>Users</th>
              <th className={`${th} text-right`}>Organic Users</th>
              <th className={`${th} text-right`}>Organic比</th>
              <th className={`${th} text-right`}>収益</th>
              <th className="py-2 font-normal">PV推移</th>
            </>
          }
        >
          {v.rows.map((r, i) => (
            <tr key={r.id} className={tr}>
              <td className="py-2 pr-2 text-zinc-500">{i + 1}</td>
              <td className={td}>
                <Link
                  href={`/sites/${r.id}/`}
                  className="font-medium hover:underline"
                >
                  {r.name}
                </Link>
              </td>
              <td className={`${td} text-right`}>{num(r.current.pv)}</td>
              <td className={td}>
                <div className="h-1.5 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(r.current.pv / totalPv) * 100}%`,
                      background: "var(--series-1)",
                    }}
                  />
                </div>
              </td>
              <td className={`${td} text-right`}>
                <Delta current={r.current.pv} previous={r.previous.pv} />
              </td>
              <td className={`${td} text-right`}>{num(r.current.users)}</td>
              <td className={`${td} text-right`}>
                {num(r.current.organicUsers)}
              </td>
              <td className={`${td} text-right`}>
                <Delta
                  current={r.current.organicUsers}
                  previous={r.previous.organicUsers}
                />
              </td>
              <td className={`${td} text-right`}>{yen(r.current.revenue)}</td>
              <td className="py-2">
                <Sparkline values={r.spark} />
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}

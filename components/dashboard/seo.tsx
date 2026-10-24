"use client"
import Link from "next/link"
import {
  ByPeriod,
  Period,
  Query,
  Seo,
  Site,
  ctr,
  opportunities,
  sumSeo,
} from "@/lib/metrics"
import { Delta, num } from "./format"
import { usePeriod } from "./period"
import { Card, Kpi, Table, td, th, tr } from "./ui"

const pct1 = (r: number) => `${(r * 100).toFixed(1)}%`

export const SeoKpis = ({
  current,
  previous,
}: {
  current: Seo
  previous: Seo
}) => (
  <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <Kpi
      label="クリック数"
      value={num(current.clicks)}
      current={current.clicks}
      previous={previous.clicks}
    />
    <Kpi
      label="表示回数"
      value={num(current.impressions)}
      current={current.impressions}
      previous={previous.impressions}
    />
    <Kpi
      label="CTR"
      value={pct1(ctr(current))}
      current={ctr(current)}
      previous={ctr(previous)}
    />
    <Kpi
      label="平均掲載順位"
      value={current.position.toFixed(1)}
      current={current.position}
      previous={previous.position}
      diff
      invert
    />
  </section>
)

export const QueryTable = ({
  queries,
  period,
  sites,
}: {
  queries: Query[]
  period: Period
  sites?: Site[]
}) => {
  const name = new Map(sites?.map((s) => [s.id, s.name]))
  return (
    <Table
      head={
        <>
          <th className="py-2 pr-2 font-normal">#</th>
          <th className={th}>キーワード</th>
          {sites && <th className={th}>サイト</th>}
          <th className={`${th} text-right`}>クリック</th>
          <th className={`${th} text-right`}>前期間比</th>
          <th className={`${th} text-right`}>表示回数</th>
          <th className={`${th} text-right`}>CTR</th>
          <th className={`${th} text-right`}>順位</th>
          <th className={`${th} text-right`}>順位変化</th>
        </>
      }
    >
      {queries.map((q, i) => {
        const { current: c, previous: p } = q.periods[period]
        return (
          <tr key={q.site + q.query} className={tr}>
            <td className="py-2 pr-2 text-zinc-500">{i + 1}</td>
            <td className={`${td} whitespace-nowrap`}>{q.query}</td>
            {sites && (
              <td className={`${td} whitespace-nowrap`}>
                <Link href={`/sites/${q.site}/`} className="hover:underline">
                  {name.get(q.site) ?? q.site}
                </Link>
              </td>
            )}
            <td className={`${td} text-right`}>{num(c.clicks)}</td>
            <td className={`${td} text-right whitespace-nowrap`}>
              <Delta current={c.clicks} previous={p.clicks} />
            </td>
            <td className={`${td} text-right`}>{num(c.impressions)}</td>
            <td className={`${td} text-right`}>{pct1(ctr(c))}</td>
            <td className={`${td} text-right`}>{c.position.toFixed(1)}</td>
            <td className={`${td} text-right whitespace-nowrap`}>
              <Delta current={c.position} previous={p.position} diff invert />
            </td>
          </tr>
        )
      })}
    </Table>
  )
}

export const SeoOverview = ({
  sites,
  siteSeo,
  queries,
}: {
  sites: Site[]
  siteSeo: Record<string, ByPeriod<Seo>>
  queries: Query[]
}) => {
  const period = usePeriod()
  const rows = sites
    .filter((s) => siteSeo[s.id])
    .map((s) => ({ ...s, ...siteSeo[s.id][period] }))
    .sort((a, b) => b.current.clicks - a.current.clicks)
  const total = {
    current: sumSeo(rows.map((r) => r.current)),
    previous: sumSeo(rows.map((r) => r.previous)),
  }
  const name = new Map(sites.map((s) => [s.id, s.name]))
  const opps = opportunities(queries, period).slice(0, 10)
  const top = [...queries]
    .sort(
      (a, b) =>
        b.periods[period].current.clicks - a.periods[period].current.clicks
    )
    .slice(0, 30)

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">SEO</h2>
      <SeoKpis {...total} />

      <Card title="SEO Opportunity">
        <p className="mb-3 text-xs text-zinc-500">
          5〜20位のキーワードを、CTR
          10%（上位表示時の目安）に届いた場合の追加クリック数順に表示
        </p>
        <Table
          head={
            <>
              <th className={th}>キーワード</th>
              <th className={th}>サイト</th>
              <th className={`${th} text-right`}>順位</th>
              <th className={`${th} text-right`}>表示回数</th>
              <th className={`${th} text-right`}>クリック</th>
              <th className={`${th} text-right`}>CTR</th>
              <th className={`${th} text-right`}>獲得余地</th>
            </>
          }
        >
          {opps.map((o) => (
            <tr key={o.site + o.query} className={tr}>
              <td className={`${td} whitespace-nowrap font-medium`}>
                {o.query}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <Link href={`/sites/${o.site}/`} className="hover:underline">
                  {name.get(o.site) ?? o.site}
                </Link>
              </td>
              <td className={`${td} text-right`}>{o.s.position.toFixed(1)}</td>
              <td className={`${td} text-right`}>{num(o.s.impressions)}</td>
              <td className={`${td} text-right`}>{num(o.s.clicks)}</td>
              <td className={`${td} text-right`}>{pct1(ctr(o.s))}</td>
              <td className={`${td} text-right font-medium`}>
                +{num(o.potential)}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="サイト別SEOランキング">
        <Table
          head={
            <>
              <th className="py-2 pr-2 font-normal">#</th>
              <th className={th}>サイト</th>
              <th className={`${th} text-right`}>クリック</th>
              <th className={`${th} text-right`}>前期間比</th>
              <th className={`${th} text-right`}>表示回数</th>
              <th className={`${th} text-right`}>CTR</th>
              <th className={`${th} text-right`}>平均順位</th>
              <th className={`${th} text-right`}>順位変化</th>
            </>
          }
        >
          {rows.map((r, i) => (
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
              <td className={`${td} text-right`}>{num(r.current.clicks)}</td>
              <td className={`${td} text-right`}>
                <Delta
                  current={r.current.clicks}
                  previous={r.previous.clicks}
                />
              </td>
              <td className={`${td} text-right`}>
                {num(r.current.impressions)}
              </td>
              <td className={`${td} text-right`}>{pct1(ctr(r.current))}</td>
              <td className={`${td} text-right`}>
                {r.current.position.toFixed(1)}
              </td>
              <td className={`${td} text-right`}>
                <Delta
                  current={r.current.position}
                  previous={r.previous.position}
                  diff
                  invert
                />
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="検索キーワードランキング">
        <QueryTable queries={top} period={period} sites={sites} />
      </Card>
    </div>
  )
}

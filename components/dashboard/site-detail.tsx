"use client"
import { useState } from "react"
import {
  Article,
  ByPeriod,
  Metrics,
  Period,
  Query,
  Seo,
  Site,
  View,
} from "@/lib/metrics"
import { ArticleTable, rankArticles } from "./articles"
import { KPIS } from "./dashboard"
import { Delta } from "./format"
import { LineChart } from "./line-chart"
import { usePeriod } from "./period"
import { QueryTable, SeoKpis } from "./seo"
import { Card, Kpi, Segmented, Table, td, th, tr } from "./ui"

export const SiteDetail = ({
  site,
  views,
  seo,
  queries,
  articles,
}: {
  site: Site
  views: Record<Period, View>
  seo?: ByPeriod<Seo>
  queries: Query[]
  articles: Article[]
}) => {
  const period = usePeriod()
  const [metric, setMetric] = useState<keyof Metrics>("pv")
  const v = views[period]
  const m = KPIS.find((k) => k.key === metric)!
  const topQueries = [...queries]
    .sort(
      (a, b) =>
        b.periods[period].current.clicks - a.periods[period].current.clicks
    )
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold">{site.name}</h2>
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-zinc-500 hover:underline"
        >
          {site.url} ↗
        </a>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {KPIS.map(({ key, label, fmt }) => (
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
        <Card
          title="推移"
          className="lg:col-span-2"
          action={
            <Segmented<keyof Metrics>
              label="指標"
              options={KPIS.map((k) => [k.key, k.label] as const)}
              value={metric}
              onChange={setMetric}
            />
          }
        >
          <LineChart
            dates={v.daily.map((d) => d.date)}
            series={v.daily.map((d) => d[metric])}
            prevSeries={v.prevDaily.map((d) => d[metric])}
            label={m.label}
            fmt={m.fmt}
          />
        </Card>
        <Card title="期間比較">
          <Table
            head={
              <>
                <th className={th}>指標</th>
                <th className={`${th} text-right`}>今期間</th>
                <th className={`${th} text-right`}>前期間</th>
                <th className="py-2 text-right font-normal">比率</th>
              </>
            }
          >
            {KPIS.map(({ key, label, fmt }) => (
              <tr key={key} className={tr}>
                <td className={td}>{label}</td>
                <td className={`${td} text-right`}>{fmt(v.current[key])}</td>
                <td className={`${td} text-right text-zinc-500`}>
                  {fmt(v.previous[key])}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  <Delta current={v.current[key]} previous={v.previous[key]} />
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      {seo && (
        <div className="space-y-4">
          <h3 className="font-medium">SEO流入（Search Console）</h3>
          <SeoKpis {...seo[period]} />
          <Card title="検索キーワード">
            <QueryTable queries={topQueries} period={period} />
          </Card>
        </div>
      )}

      <Card title="人気記事">
        <ArticleTable
          rows={rankArticles(articles, period, "pv").slice(0, 10)}
        />
      </Card>
    </div>
  )
}

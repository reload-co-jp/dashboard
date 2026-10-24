"use client"
import Link from "next/link"
import { useState } from "react"
import { Article, Period, Site } from "@/lib/metrics"
import { Delta, num } from "./format"
import { usePeriod } from "./period"
import { Card, Segmented, Table, td, th, tr } from "./ui"

type Sort = "pv" | "rising" | "falling" | "organic"

const SORTS: [Sort, string][] = [
  ["pv", "PVランキング"],
  ["rising", "急上昇"],
  ["falling", "下落"],
  ["organic", "Organic流入"],
]

/** Rising/falling rank by absolute PV change so tiny pages with huge % don't dominate. */
export const rankArticles = (
  articles: Article[],
  period: Period,
  sort: Sort
) => {
  const rows = articles.map((a) => {
    const { current, previous } = a.periods[period]
    return { ...a, current, previous, diff: current.pv - previous.pv }
  })
  if (sort === "rising")
    return rows.filter((r) => r.diff > 0).sort((a, b) => b.diff - a.diff)
  if (sort === "falling")
    return rows.filter((r) => r.diff < 0).sort((a, b) => a.diff - b.diff)
  const key = sort === "pv" ? "pv" : "organicUsers"
  return rows.sort((a, b) => b.current[key] - a.current[key])
}

export const ArticleTable = ({
  rows,
  sites,
}: {
  rows: ReturnType<typeof rankArticles>
  sites?: Site[]
}) => {
  const name = new Map(sites?.map((s) => [s.id, s.name]))
  return (
    <Table
      head={
        <>
          <th className="py-2 pr-2 font-normal">#</th>
          {sites && <th className={th}>サイト</th>}
          <th className={th}>記事</th>
          <th className={`${th} text-right`}>PV</th>
          <th className={`${th} text-right`}>前期間比</th>
          <th className={`${th} text-right`}>Users</th>
          <th className={`${th} text-right`}>Organic</th>
          <th className={`${th} text-right`}>Organic比</th>
        </>
      }
    >
      {rows.map((r, i) => (
        <tr key={r.url} className={tr}>
          <td className="py-2 pr-2 text-zinc-500">{i + 1}</td>
          {sites && (
            <td className={`${td} whitespace-nowrap`}>
              <Link href={`/sites/${r.site}/`} className="hover:underline">
                {name.get(r.site) ?? r.site}
              </Link>
            </td>
          )}
          <td className={`${td} min-w-64`}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {r.title}
            </a>
            <div className="truncate text-xs text-zinc-500">{r.url}</div>
          </td>
          <td className={`${td} text-right`}>{num(r.current.pv)}</td>
          <td className={`${td} text-right whitespace-nowrap`}>
            <Delta current={r.current.pv} previous={r.previous.pv} />
          </td>
          <td className={`${td} text-right`}>{num(r.current.users)}</td>
          <td className={`${td} text-right`}>{num(r.current.organicUsers)}</td>
          <td className={`${td} text-right whitespace-nowrap`}>
            <Delta
              current={r.current.organicUsers}
              previous={r.previous.organicUsers}
            />
          </td>
        </tr>
      ))}
      {!rows.length && (
        <tr>
          <td colSpan={8} className="py-6 text-center text-zinc-500">
            該当なし
          </td>
        </tr>
      )}
    </Table>
  )
}

export const ArticleRanking = ({
  articles,
  sites,
}: {
  articles: Article[]
  sites: Site[]
}) => {
  const period = usePeriod()
  const [sort, setSort] = useState<Sort>("pv")
  const [site, setSite] = useState("")
  const rows = rankArticles(
    site ? articles.filter((a) => a.site === site) : articles,
    period,
    sort
  ).slice(0, 50)
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">記事ランキング</h2>
      <Card
        title={SORTS.find(([s]) => s === sort)?.[1]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="サイト"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-sm dark:border-zinc-800"
            >
              <option value="">全サイト</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Segmented<Sort>
              label="並び順"
              options={SORTS}
              value={sort}
              onChange={setSort}
            />
          </div>
        }
      >
        <ArticleTable rows={rows} sites={sites} />
      </Card>
    </div>
  )
}

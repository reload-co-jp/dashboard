export type Site = { id: string; name: string; url: string }
export type Metrics = {
  pv: number
  users: number
  sessions: number
  organicUsers: number
  revenue: number
}
export type Day = Metrics & { date: string }
export type SiteRow = Site & {
  current: Metrics
  previous: Metrics
  spark: number[]
}
export type View = {
  days: number
  current: Metrics
  previous: Metrics
  daily: Day[]
  prevDaily: Day[]
  rows: SiteRow[]
}

export const PERIODS = [7, 30, 90] as const
export type Period = (typeof PERIODS)[number]

/** Pre-aggregated current/previous values per period, as fetched from GA4/GSC. */
export type ByPeriod<T> = Record<`${Period}`, { current: T; previous: T }>
export type Seo = { clicks: number; impressions: number; position: number }
export type ArticleMetrics = Pick<Metrics, "pv" | "users" | "organicUsers">
export type Article = {
  site: string
  url: string
  title: string
  periods: ByPeriod<ArticleMetrics>
}
export type Query = { site: string; query: string; periods: ByPeriod<Seo> }

const ZERO: Metrics = {
  pv: 0,
  users: 0,
  sessions: 0,
  organicUsers: 0,
  revenue: 0,
}
const KEYS = Object.keys(ZERO) as (keyof Metrics)[]

export const sum = (days: Metrics[]): Metrics =>
  days.reduce(
    (acc, d) =>
      Object.fromEntries(KEYS.map((k) => [k, acc[k] + d[k]])) as Metrics,
    ZERO
  )

/** Ratio change vs previous period; null when there is no previous data. */
export const change = (current: number, previous: number) =>
  previous ? (current - previous) / previous : null

/** Merge GA traffic and AdSense revenue rows by date. */
export const mergeDaily = (
  traffic: Omit<Day, "revenue">[],
  revenue: { date: string; revenue: number }[] = []
): Day[] => {
  const byDate = new Map(revenue.map((r) => [r.date, r.revenue]))
  return traffic.map((t) => ({ ...t, revenue: byDate.get(t.date) ?? 0 }))
}

/** Sum all sites per date (assumes every site covers the same dates). */
export const totalDaily = (perSite: Day[][]): Day[] =>
  (perSite[0] ?? []).map((d, i) => ({
    ...sum(perSite.map((days) => days[i]).filter(Boolean)),
    date: d.date,
  }))

export const buildView = (
  sites: Site[],
  daily: Record<string, Day[]>,
  days: number
): View => {
  const total = totalDaily(sites.map((s) => daily[s.id] ?? []))
  const cur = total.slice(-days)
  const prev = total.slice(-2 * days, -days)
  return {
    days,
    current: sum(cur),
    previous: sum(prev),
    daily: cur,
    prevDaily: prev,
    rows: sites
      .map((s) => {
        const d = daily[s.id] ?? []
        const c = d.slice(-days)
        return {
          ...s,
          current: sum(c),
          previous: sum(d.slice(-2 * days, -days)),
          spark: c.map((x) => x.pv),
        }
      })
      .sort((a, b) => b.current.pv - a.current.pv),
  }
}

export const ctr = (s: Seo) => (s.impressions ? s.clicks / s.impressions : 0)

/** Sum clicks/impressions; position is impression-weighted. */
export const sumSeo = (rows: Seo[]): Seo => {
  const impressions = rows.reduce((a, r) => a + r.impressions, 0)
  return {
    clicks: rows.reduce((a, r) => a + r.clicks, 0),
    impressions,
    position: impressions
      ? rows.reduce((a, r) => a + r.position * r.impressions, 0) / impressions
      : 0,
  }
}

// ponytail: fixed rank band and target CTR (~top-3 average); tune once real GSC data arrives
const TARGET_CTR = 0.1

/** Queries ranked 5-20 sorted by extra clicks they'd get at TARGET_CTR. */
export const opportunities = (queries: Query[], period: Period) =>
  queries
    .map((q) => {
      const s = q.periods[period].current
      return {
        ...q,
        s,
        potential: Math.round(s.impressions * TARGET_CTR - s.clicks),
      }
    })
    .filter(
      ({ s, potential }) => s.position >= 5 && s.position <= 20 && potential > 0
    )
    .sort((a, b) => b.potential - a.potential)

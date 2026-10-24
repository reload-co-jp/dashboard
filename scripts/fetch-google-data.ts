/**
 * Fetch GA4 / Search Console / AdSense into data/*.json (run by .github/workflows/update-data.yml).
 *
 *   node scripts/fetch-google-data.ts      # Node >= 24 (native TS type stripping, no deps)
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (OAuth user with
 * analytics.readonly, webmasters.readonly, adsense.readonly), ADSENSE_ACCOUNT ("accounts/pub-...").
 * Per site in data/sites.json: "ga4" (property ID) and "gsc" ("sc-domain:example.com" or URL prefix).
 * A source with no config is skipped and its JSON left as is. Any API error aborts before writing.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { ArticleMetrics, ByPeriod, Day, Seo, Site } from "../lib/metrics"

type SiteConfig = Site & { ga4?: string; gsc?: string }
type Compare<T> = { current: T; previous: T }
type Period = 7 | 30 | 90

const PERIODS: Period[] = [7, 30, 90]
const DAYS = 180 // 90-day view + its previous period
const GA_LAG = 1 // GA4 / AdSense: up to yesterday
const GSC_LAG = 3 // Search Console data settles in ~2-3 days

// --- dates (JST) ---

const DAY_MS = 86_400_000
export const daysAgo = (n: number, now = Date.now()) =>
  new Date(now + 9 * 3_600_000 - n * DAY_MS).toISOString().slice(0, 10)

/** Every date in the window, oldest first — all sites share it so totals align by index. */
export const dateList = (days: number, lag: number, now?: number) =>
  Array.from({ length: days }, (_, i) => daysAgo(lag + days - 1 - i, now))

/** current = last `days` ending `lag` days ago; previous = the `days` before that. */
export const ranges = (days: number, lag: number, now?: number) => ({
  current: {
    startDate: daysAgo(lag + days - 1, now),
    endDate: daysAgo(lag, now),
  },
  previous: {
    startDate: daysAgo(lag + 2 * days - 1, now),
    endDate: daysAgo(lag + days, now),
  },
})

/**
 * Union of the top `n` keys of each period (by `score`), with every period filled in
 * (missing → zero) so each item has values for 7/30/90.
 */
export const pickTop = <T>(
  perPeriod: Record<Period, Map<string, Compare<T>>>,
  zero: T,
  score: (v: Compare<T>) => number,
  n: number
): [string, ByPeriod<T>][] => {
  const keys = new Set(
    PERIODS.flatMap((p) =>
      [...perPeriod[p]]
        .sort((a, b) => score(b[1]) - score(a[1]))
        .slice(0, n)
        .map(([k]) => k)
    )
  )
  return [...keys].map((k) => [
    k,
    Object.fromEntries(
      PERIODS.map((p) => [
        p,
        perPeriod[p].get(k) ?? { current: zero, previous: zero },
      ])
    ) as ByPeriod<T>,
  ])
}

// --- HTTP ---

let accessToken = ""

const auth = async () => {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) throw new Error(`OAuth token: ${res.status} ${await res.text()}`)
  accessToken = (await res.json()).access_token
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = async (url: string, body?: unknown): Promise<any> => {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${url}\n${await res.text()}`)
  return res.json()
}

// --- GA4 ---

type GaRow = {
  dimensionValues: { value: string }[]
  metricValues: { value: string }[]
}

const ga4 = (property: string, body: unknown) =>
  api(
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
    body
  )

const ORGANIC = {
  dimensionFilter: {
    filter: {
      fieldName: "sessionDefaultChannelGroup",
      stringFilter: { value: "Organic Search" },
    },
  },
}

const gaDate = (v: string) => `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}`

// ponytail: daily totalUsers summed over a period overcounts returning users;
// fetch period-level users if exact uniques matter
const fetchTraffic = async (property: string, dates: string[]) => {
  const dateRanges = [{ startDate: dates[0], endDate: dates.at(-1) }]
  const daily = async (metrics: string[], extra = {}) => {
    const r = await ga4(property, {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: metrics.map((name) => ({ name })),
      limit: dates.length,
      ...extra,
    })
    return new Map(
      ((r.rows ?? []) as GaRow[]).map((row) => [
        gaDate(row.dimensionValues[0].value),
        row.metricValues.map((m) => Number(m.value)),
      ])
    )
  }
  const [all, organic] = await Promise.all([
    daily(["screenPageViews", "totalUsers", "sessions"]),
    daily(["totalUsers"], ORGANIC),
  ])
  return dates.map((date) => {
    const [pv = 0, users = 0, sessions = 0] = all.get(date) ?? []
    return {
      date,
      pv,
      users,
      sessions,
      organicUsers: organic.get(date)?.[0] ?? 0,
    }
  })
}

const ZERO_ARTICLE: ArticleMetrics = { pv: 0, users: 0, organicUsers: 0 }

const fetchArticles = async (site: SiteConfig) => {
  const titles = new Map<string, string>()
  const perPeriod = {} as Record<Period, Map<string, Compare<ArticleMetrics>>>
  for (const p of PERIODS) {
    const { current, previous } = ranges(p, GA_LAG)
    const report = (extra = {}) =>
      ga4(site.ga4!, {
        dateRanges: [
          { ...current, name: "current" },
          { ...previous, name: "previous" },
        ],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 500,
        ...extra,
      })
    const [all, organic] = await Promise.all([report(), report(ORGANIC)])
    const map = new Map<string, Compare<ArticleMetrics>>()
    const each = (
      r: { rows?: GaRow[]; dimensionHeaders: { name: string }[] },
      fn: (path: string, range: "current" | "previous", m: number[]) => void
    ) => {
      const rangeIdx = r.dimensionHeaders.findIndex(
        (h) => h.name === "dateRange"
      )
      if (rangeIdx < 0)
        throw new Error("GA4 response lacks dateRange dimension")
      for (const row of r.rows ?? []) {
        const [path, title] = row.dimensionValues.map((d) => d.value)
        if (!titles.has(path)) titles.set(path, title)
        const range = row.dimensionValues[rangeIdx].value as
          "current" | "previous"
        fn(
          path,
          range,
          row.metricValues.map((m) => Number(m.value))
        )
      }
    }
    const entry = (path: string) => {
      if (!map.has(path))
        map.set(path, {
          current: { ...ZERO_ARTICLE },
          previous: { ...ZERO_ARTICLE },
        })
      return map.get(path)!
    }
    // Same path may appear with several titles → sum
    each(all, (path, range, [pv, users]) => {
      entry(path)[range].pv += pv
      entry(path)[range].users += users
    })
    each(organic, (path, range, [, users]) => {
      entry(path)[range].organicUsers += users
    })
    perPeriod[p] = map
  }
  const origin = new URL(site.url).origin
  return pickTop(
    perPeriod,
    ZERO_ARTICLE,
    (v) => Math.max(v.current.pv, v.previous.pv),
    20
  ).map(([path, periods]) => ({
    site: site.id,
    url: origin + path,
    title: titles.get(path) ?? path,
    periods,
  }))
}

// --- Search Console ---

type GscRow = {
  keys?: string[]
  clicks: number
  impressions: number
  position: number
}

const gsc = async (property: string, body: object): Promise<GscRow[]> =>
  (
    await api(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
      { dataState: "final", ...body }
    )
  ).rows ?? []

const ZERO_SEO: Seo = { clicks: 0, impressions: 0, position: 0 }
const toSeo = (r?: GscRow): Seo =>
  r
    ? {
        clicks: r.clicks,
        impressions: r.impressions,
        position: Math.round(r.position * 10) / 10,
      }
    : ZERO_SEO

const fetchSeo = async (site: SiteConfig) => {
  const totals = {} as ByPeriod<Seo>
  const perPeriod = {} as Record<Period, Map<string, Compare<Seo>>>
  for (const p of PERIODS) {
    const r = ranges(p, GSC_LAG)
    const [tc, tp, qc, qp] = await Promise.all([
      gsc(site.gsc!, r.current),
      gsc(site.gsc!, r.previous),
      gsc(site.gsc!, { ...r.current, dimensions: ["query"], rowLimit: 1000 }),
      gsc(site.gsc!, { ...r.previous, dimensions: ["query"], rowLimit: 1000 }),
    ])
    totals[p] = { current: toSeo(tc[0]), previous: toSeo(tp[0]) }
    const prev = new Map(qp.map((row) => [row.keys![0], row]))
    perPeriod[p] = new Map(
      qc.map((row) => [
        row.keys![0],
        { current: toSeo(row), previous: toSeo(prev.get(row.keys![0])) },
      ])
    )
  }
  // ponytail: picks by impressions (covers both click ranking and Opportunity); widen n if needed
  const queries = pickTop(
    perPeriod,
    ZERO_SEO,
    (v) => v.current.impressions,
    50
  ).map(([query, periods]) => ({ site: site.id, query, periods }))
  return { totals, queries }
}

// --- AdSense ---

const fetchRevenue = async (
  account: string,
  sites: SiteConfig[],
  dates: string[]
) => {
  const params = new URLSearchParams({
    dateRange: "CUSTOM",
    currencyCode: "JPY",
  })
  for (const [key, date] of [
    ["startDate", dates[0]],
    ["endDate", dates.at(-1)!],
  ]) {
    const [year, month, day] = date.split("-").map(Number)
    params.set(`${key}.year`, String(year))
    params.set(`${key}.month`, String(month))
    params.set(`${key}.day`, String(day))
  }
  params.append("dimensions", "DATE")
  params.append("dimensions", "DOMAIN_NAME")
  params.append("metrics", "ESTIMATED_EARNINGS")
  const r = await api(
    `https://adsense.googleapis.com/v2/${account}/reports:generate?${params}`
  )

  const host = (h: string) => h.replace(/^www\./, "")
  const siteByHost = new Map(
    sites.map((s) => [host(new URL(s.url).hostname), s.id])
  )
  const earnings = new Map<string, number>() // `${site}|${date}` → JPY
  for (const { cells } of (r.rows ?? []) as { cells: { value: string }[] }[]) {
    const id = siteByHost.get(host(cells[1].value))
    if (!id) continue
    const key = `${id}|${cells[0].value}`
    earnings.set(key, (earnings.get(key) ?? 0) + Number(cells[2].value))
  }
  return Object.fromEntries(
    sites.map((s) => [
      s.id,
      dates.map((date) => ({
        date,
        revenue: Math.round(earnings.get(`${s.id}|${date}`) ?? 0),
      })),
    ])
  )
}

// --- main ---

const main = async () => {
  const sites: SiteConfig[] = JSON.parse(
    readFileSync("data/sites.json", "utf8")
  )
  const dates = dateList(DAYS, GA_LAG)
  const useGa4 = sites.some((s) => s.ga4)
  const useGsc = sites.some((s) => s.gsc)
  const adsense = process.env.ADSENSE_ACCOUNT
  if (!useGa4 && !useGsc && !adsense) {
    console.log(
      "No source configured (sites.json ga4/gsc, ADSENSE_ACCOUNT); nothing written."
    )
    return
  }
  await auth()
  const out: Record<string, unknown> = {}

  if (useGa4) {
    // Sites without GA4 get zero rows so every site keeps the same date index
    out.traffic = Object.fromEntries(
      await Promise.all(
        sites.map(async (s): Promise<[string, Omit<Day, "revenue">[]]> => [
          s.id,
          s.ga4
            ? await fetchTraffic(s.ga4, dates)
            : dates.map((date) => ({
                date,
                pv: 0,
                users: 0,
                sessions: 0,
                organicUsers: 0,
              })),
        ])
      )
    )
    out.articles = (
      await Promise.all(sites.filter((s) => s.ga4).map(fetchArticles))
    ).flat()
  }

  if (useGsc) {
    const seo = await Promise.all(
      sites
        .filter((s) => s.gsc)
        .map(async (s) => [s.id, await fetchSeo(s)] as const)
    )
    out.seo = {
      sites: Object.fromEntries(seo.map(([id, r]) => [id, r.totals])),
      queries: seo.flatMap(([, r]) => r.queries),
    }
  }

  if (adsense) {
    out.revenue = await fetchRevenue(adsense, sites, dates)
  }

  for (const [name, data] of Object.entries(out)) {
    writeFileSync(`data/${name}.json`, JSON.stringify(data) + "\n")
    console.log(`wrote data/${name}.json`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

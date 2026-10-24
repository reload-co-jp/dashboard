import sitesJson from "@/data/sites.json"
import trafficJson from "@/data/traffic.json"
import revenueJson from "@/data/revenue.json"
import seoJson from "@/data/seo.json"
import articlesJson from "@/data/articles.json"
import {
  Article,
  ByPeriod,
  Day,
  PERIODS,
  Period,
  Query,
  Seo,
  Site,
  View,
  buildView,
  mergeDaily,
} from "./metrics"

// Build-time only: imported from server components so raw JSON never ships to the client.
export const sites: Site[] = sitesJson

const traffic = trafficJson as Record<string, Omit<Day, "revenue">[]>
const revenue = revenueJson as Record<
  string,
  { date: string; revenue: number }[]
>

export const daily: Record<string, Day[]> = Object.fromEntries(
  sites.map((s) => [s.id, mergeDaily(traffic[s.id] ?? [], revenue[s.id])])
)

export const viewsFor = (list: Site[]) =>
  Object.fromEntries(
    PERIODS.map((p) => [p, buildView(list, daily, p)])
  ) as Record<Period, View>

export const views = viewsFor(sites)

export const lastUpdated = daily[sites[0]?.id]?.at(-1)?.date ?? ""

export const articles = articlesJson as Article[]
export const seo = seoJson as {
  sites: Record<string, ByPeriod<Seo>>
  queries: Query[]
}

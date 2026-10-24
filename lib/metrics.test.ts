import { describe, expect, it } from "vitest"
import {
  Query,
  buildView,
  change,
  mergeDaily,
  opportunities,
  sumSeo,
} from "./metrics"

const day = (date: string, pv: number) => ({
  date,
  pv,
  users: pv / 2,
  sessions: pv / 2,
  organicUsers: pv / 4,
})

describe("metrics", () => {
  it("change handles zero previous", () => {
    expect(change(120, 100)).toBeCloseTo(0.2)
    expect(change(10, 0)).toBeNull()
  })

  it("mergeDaily joins revenue by date", () => {
    const m = mergeDaily(
      [day("2026-01-01", 10), day("2026-01-02", 20)],
      [{ date: "2026-01-02", revenue: 5 }]
    )
    expect(m.map((d) => d.revenue)).toEqual([0, 5])
  })

  it("buildView splits current/previous and ranks sites", () => {
    const sites = [
      { id: "a", name: "A", url: "" },
      { id: "b", name: "B", url: "" },
    ]
    const dates = ["d1", "d2", "d3", "d4"]
    const daily = {
      a: mergeDaily(dates.map((d, i) => day(d, i + 1))), // 1,2,3,4
      b: mergeDaily(dates.map((d) => day(d, 10))),
    }
    const v = buildView(sites, daily, 2)
    expect(v.current.pv).toBe(3 + 4 + 20)
    expect(v.previous.pv).toBe(1 + 2 + 20)
    expect(v.daily.map((d) => d.pv)).toEqual([13, 14])
    expect(v.rows.map((r) => r.id)).toEqual(["b", "a"])
    expect(v.rows[1].previous.pv).toBe(3)
  })

  it("sumSeo weights position by impressions", () => {
    const s = sumSeo([
      { clicks: 10, impressions: 100, position: 2 },
      { clicks: 0, impressions: 300, position: 10 },
    ])
    expect(s).toEqual({ clicks: 10, impressions: 400, position: 8 })
  })

  it("opportunities keeps rank 5-20 with click headroom", () => {
    const q = (
      query: string,
      clicks: number,
      impressions: number,
      position: number
    ): Query => {
      const v = {
        current: { clicks, impressions, position },
        previous: { clicks, impressions, position },
      }
      return { site: "a", query, periods: { "7": v, "30": v, "90": v } }
    }
    const r = opportunities(
      [
        q("top", 100, 1000, 2),
        q("small", 1, 100, 8),
        q("big", 10, 5000, 12),
        q("deep", 0, 9000, 40),
        q("saturated", 200, 1000, 6),
      ],
      30
    )
    expect(r.map((x) => [x.query, x.potential])).toEqual([
      ["big", 490],
      ["small", 9],
    ])
  })
})

import { describe, expect, it } from "vitest"
import { dateList, pickTop, ranges } from "./fetch-google-data"

// 2026-10-08 00:30 JST = 2026-10-07 15:30 UTC
const now = Date.UTC(2026, 9, 7, 15, 30)

describe("fetch-google-data", () => {
  it("computes JST date windows", () => {
    expect(dateList(3, 1, now)).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ])
    expect(ranges(7, 3, now)).toEqual({
      current: { startDate: "2026-09-29", endDate: "2026-10-05" },
      previous: { startDate: "2026-09-22", endDate: "2026-09-28" },
    })
  })

  it("pickTop unions per-period top keys and zero-fills", () => {
    const v = (n: number) => ({ current: n, previous: 0 })
    const top = pickTop(
      {
        7: new Map([
          ["a", v(5)],
          ["b", v(1)],
        ]),
        30: new Map([
          ["c", v(9)],
          ["a", v(2)],
        ]),
        90: new Map([["a", v(3)]]),
      },
      0,
      (x) => x.current,
      1
    )
    expect(Object.fromEntries(top)).toEqual({
      a: { 7: v(5), 30: v(2), 90: v(3) },
      c: { 7: v(0), 30: v(9), 90: v(0) },
    })
  })
})

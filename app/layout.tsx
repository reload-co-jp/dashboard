import Link from "next/link"
import { Footer, Header, Main, Title } from "@/components/elements/layout"
import { PeriodProvider, PeriodToggle } from "@/components/dashboard/period"
import { lastUpdated } from "@/lib/data"
import "./globals.css"

export const metadata = {
  title: "ReLoad Analytics",
  description: "ReLoad運営サイトのアクセス・SEO・収益ダッシュボード",
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja">
      <body className="bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <PeriodProvider>
          <Header>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Title>
                <Link href="/">ReLoad Analytics</Link>
              </Title>
              <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                <Link
                  href="/"
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  概要
                </Link>
                <Link
                  href="/seo/"
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  SEO
                </Link>
                <Link
                  href="/articles/"
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  記事
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden text-xs text-zinc-500 md:inline">
                データ更新: {lastUpdated}
              </span>
              <PeriodToggle />
            </div>
          </Header>
          <Main>{children}</Main>
        </PeriodProvider>
        <Footer>
          <p>&copy; ReLoad</p>
        </Footer>
      </body>
    </html>
  )
}
export default RootLayout

import { ArticleRanking } from "@/components/dashboard/articles"
import { articles, sites } from "@/lib/data"

export const metadata = { title: "記事 | ReLoad Analytics" }

const Page = () => <ArticleRanking articles={articles} sites={sites} />

export default Page

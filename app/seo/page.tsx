import { SeoOverview } from "@/components/dashboard/seo"
import { seo, sites } from "@/lib/data"

export const metadata = { title: "SEO | ReLoad Analytics" }

const Page = () => (
  <SeoOverview sites={sites} siteSeo={seo.sites} queries={seo.queries} />
)

export default Page

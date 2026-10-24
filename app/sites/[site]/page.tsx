import { notFound } from "next/navigation"
import { SiteDetail } from "@/components/dashboard/site-detail"
import { articles, seo, sites, viewsFor } from "@/lib/data"

export const dynamicParams = false

export const generateStaticParams = () => sites.map((s) => ({ site: s.id }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ site: string }>
}) => {
  const { site } = await params
  return {
    title: `${sites.find((s) => s.id === site)?.name} | ReLoad Analytics`,
  }
}

const Page = async ({ params }: { params: Promise<{ site: string }> }) => {
  const { site: id } = await params
  const site = sites.find((s) => s.id === id)
  if (!site) notFound()
  return (
    <SiteDetail
      site={site}
      views={viewsFor([site])}
      seo={seo.sites[id]}
      queries={seo.queries.filter((q) => q.site === id)}
      articles={articles.filter((a) => a.site === id)}
    />
  )
}

export default Page

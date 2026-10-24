import { FC } from "react"
import { Dashboard } from "@/components/dashboard/dashboard"
import { views } from "@/lib/data"

const Page: FC = () => <Dashboard views={views} />

export default Page

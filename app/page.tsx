import { MatrixRain } from "@/components/matrix-rain"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { OperationsTable } from "@/components/operations-table"
import { MonthlyCalendar } from "@/components/monthly-calendar"
import { StatsCards } from "@/components/stats-cards"
import { StatsOverview } from "@/components/stats-overview"

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <MatrixRain />
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <StatsCards />
        <StatsOverview />
        <OperationsTable />
        <MonthlyCalendar />
      </div>
    </div>
  )
}

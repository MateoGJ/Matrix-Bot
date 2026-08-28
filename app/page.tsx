"use client"

import { useState, useEffect } from "react"
import { MatrixRain } from "@/components/matrix-rain"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { BotListSidebar } from "@/components/bot-list-sidebar"
import { BotDetailView } from "@/components/bot-detail-view"
import { getFleetStats, BotSummary } from "@/lib/bot-api"

export default function Home() {
  const [bots, setBots] = useState<BotSummary[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchBots = async () => {
      try {
        const data = await getFleetStats()
        if (mounted) {
          setBots(data)
          if (!selectedBotId && data.length > 0) setSelectedBotId(data[0].id)
          setLoading(false)
        }
      } catch (error) {
        console.error("Error trayendo la flota:", error)
      }
    }
    fetchBots()
    const interval = setInterval(fetchBots, 5000)
    return () => { mounted = false; clearInterval(interval) }
  }, [selectedBotId])

  const selectedBot = bots.find((b) => b.id === selectedBotId) || bots[0]

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground selection:bg-primary/30">
      <MatrixRain />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <HeroSection />
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-3 pb-12 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 border-b border-border/50 pb-3 md:flex-row md:items-end md:justify-between">
            <div><p className="eyebrow mb-2 font-mono">Live fleet monitor</p><h2 className="font-mono text-xl font-bold tracking-[0.12em] text-foreground sm:text-2xl">CENTRO DE MANDO</h2></div>
            {!loading && bots.length > 0 && <div className="flex gap-2 font-mono text-[10px] uppercase tracking-wider"><div className="panel-surface rounded-md px-3 py-2 text-muted-foreground">Nodos <span className="ml-2 text-foreground">{bots.length}</span></div><div className="panel-surface rounded-md px-3 py-2 text-muted-foreground">Operando <span className="ml-2 text-primary">{bots.filter((b) => b.activeTrade).length}</span></div></div>}
          </div>
          <div className="flex min-h-[500px] flex-1 flex-col gap-4 lg:min-h-[600px] lg:flex-row lg:gap-5">
            <div className="flex h-auto w-full shrink-0 flex-col overflow-hidden rounded-xl glass-surface lg:h-full lg:w-[340px] xl:w-[380px]"><BotListSidebar bots={bots} selectedBotId={selectedBotId} onSelectBot={setSelectedBotId} /></div>
            <div className="min-h-[500px] min-w-0 flex-1 overflow-x-hidden overflow-y-visible rounded-xl glass-surface lg:h-full lg:overflow-y-auto custom-scrollbar">
              {loading ? <div className="flex h-full flex-col items-center justify-center gap-4 py-32 text-muted-foreground"><div className="size-10 animate-spin rounded-full border-2 border-border border-t-primary" /><p className="font-mono text-xs font-bold uppercase tracking-widest">{">"} Conectando a los nodos...</p></div> : selectedBot ? <BotDetailView bot={selectedBot} /> : <div className="flex h-full items-center justify-center py-32 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{">"} Sin conexión a la red de bots.</div>}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

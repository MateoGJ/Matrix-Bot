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
          if (!selectedBotId && data.length > 0) {
            setSelectedBotId(data[0].id)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error("Error trayendo la flota:", error)
      }
    }

    fetchBots()
    const interval = setInterval(fetchBots, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [selectedBotId])

  const selectedBot = bots.find((b) => b.id === selectedBotId) || bots[0]

  return (
    <div className="min-h-screen bg-black text-white relative font-mono selection:bg-zinc-700">
      <MatrixRain />
      
      <div className="relative z-10 flex flex-col w-full min-h-screen">
        <Header />
        
        <HeroSection /> 

        <main className="container mx-auto px-2 sm:px-4 pb-12 sm:pb-20 max-w-[1600px] flex-1 flex flex-col">
          
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white tracking-widest uppercase flex items-center">
                <span className="text-zinc-500 mr-3">_</span> 
                CENTRO DE MANDO
              </h2>
            </div>
            
            {!loading && bots.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-zinc-400 font-bold">
                <div className="bg-zinc-900/80 px-4 py-2 rounded-lg border border-white/5">
                  NODOS: <span className="text-white ml-2">{bots.length}</span>
                </div>
                <div className="bg-zinc-900/80 px-4 py-2 rounded-lg border border-white/5">
                  OPERANDO: <span className="text-cyan-400 ml-2">
                    {bots.filter(b => b.activeTrade).length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ESTO EVITA EL COLAPSO: min-h-[600px] y flex-1 */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-[500px] lg:min-h-[600px]">
            
            <div className="w-full lg:w-[360px] xl:w-[400px] h-auto lg:h-full flex-shrink-0 flex flex-col rounded-xl overflow-hidden shadow-2xl">
              <BotListSidebar
                bots={bots}
                selectedBotId={selectedBotId}
                onSelectBot={setSelectedBotId}
              />
            </div>

            <div className="flex-1 min-w-0 h-auto lg:h-full overflow-y-visible lg:overflow-y-auto overflow-x-hidden bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-4 py-32">
                  <div className="w-12 h-12 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin"></div>
                  <p className="animate-pulse tracking-widest text-xs font-bold uppercase">
                    &gt; Conectando a los nodos...
                  </p>
                </div>
              ) : selectedBot ? (
                <BotDetailView bot={selectedBot} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-xs py-32 font-bold uppercase tracking-widest">
                  &gt; SIN CONEXIÓN A LA RED DE BOTS.
                </div>
              )}
            </div>
          </div>
          
        </main>
      </div>
    </div>
  )
}
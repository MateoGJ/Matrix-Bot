"use client"

import { useState } from "react"
import { BotSummary } from "@/lib/bot-api"

interface BotListSidebarProps {
  bots: BotSummary[]
  selectedBotId: string | null
  onSelectBot: (id: string) => void
}

type SortOption = "ACTIVE_FIRST" | "PNL_DESC" | "NAME"

export function BotListSidebar({ bots, selectedBotId, onSelectBot }: BotListSidebarProps) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("ACTIVE_FIRST")

  const processedBots = [...(bots || [])]
    .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "ACTIVE_FIRST") {
        const aTrade = a.activeTrade ? 1 : 0
        const bTrade = b.activeTrade ? 1 : 0
        if (bTrade !== aTrade) return bTrade - aTrade
        return b.totalPnl - a.totalPnl
      }
      if (sortBy === "PNL_DESC") return b.totalPnl - a.totalPnl
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="flex flex-col h-full w-full bg-black/70 border-r border-white/5 font-mono text-sm">
      
      {/* HEADER SIDEBAR */}
      <div className="p-4 border-b border-white/35 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            NODOS ACTIVOS ({bots?.length || 0})
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
        <input
          type="text"
          placeholder="Buscar bot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-b border-white/20 px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
        />
      </div>

      {/* LISTA DE BOTS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {processedBots.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-600">Ningún bot encontrado</div>
        ) : (
          processedBots.map((bot) => {
            const isSelected = bot.id === selectedBotId
            const trade = bot.activeTrade
            const botRoi = bot.balance > 0 ? (bot.totalPnl / bot.balance) * 100 : 0

            return (
              <button
                key={bot.id}
                onClick={() => onSelectBot(bot.id)}
                className={`w-full text-left p-4 border-b border-white/35 transition-colors relative block ${
                  isSelected ? "bg-zinc-900/40" : "hover:bg-zinc-900/20"
                }`}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}
                
                <div className="flex flex-col space-y-2">
                  {/* FILA 1: Nombre */}
                  <div className="flex items-center space-x-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${bot.status === "ONLINE" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className={`font-bold text-m tracking-wide ${isSelected ? "text-white" : "text-gray-300"}`}>
                      {bot.name}
                    </span>
                  </div>
                  
                  {/* FILA 2: Métricas */}
                  <div className="flex items-center gap-2 text-[12px] font-bold text-gray-500 tracking-wider">
                    <span className="pr-5">BAL: <span className="text-white">${bot.balance?.toFixed(2)}</span></span>
                    <span className="pr-5">ROI: <span className={botRoi >= 0 ? "text-green-400" : "text-red-400"}>{botRoi >= 0 ? "+" : ""}{botRoi.toFixed(1)}%</span></span>
                    <span className="pr-5">PNL: <span className={bot.totalPnl >= 0 ? "text-green-400" : "text-red-400"}>{bot.totalPnl >= 0 ? "+" : ""}{bot.totalPnl?.toFixed(2)}$</span></span>
                  </div>

                  {/* FILA 3: Operación (Solo si hay) */}
                  {trade && (
                    <div className="mt-1 flex items-center justify-between text-[12px] text-gray-400 font-bold bg-white/5 py-1.5 px-2 rounded">
                      <div className="flex gap-2">
                        <span className={trade.tipo === "BUY" ? "text-green-400" : "text-red-400"}>{trade.tipo}</span>
                        <span>  |  </span>
                        <span className="text-teal-400">${trade.margen?.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2 text-right">
                        <span>  |  </span>
                        <span className={trade.pnlPct >= 0 ? "text-green-400" : "text-red-400"}>
                          {trade.pnlPct >= 0 ? "+" : ""}{trade.pnlPct?.toFixed(2)}%
                        </span>
                        <span>  |  </span>
                        <span className={trade.pnlActual >= 0 ? "text-green-400" : "text-red-400"}>
                          {trade.pnlActual >= 0 ? "+" : ""}{trade.pnlActual?.toFixed(2)}$
                        </span>
                        <span>  |  </span>
                        <span className={trade.estadoProteccion === "PP" ? "text-green-500" : "text-red-500"}>
                          {trade.estadoProteccion}: {trade.estadoProteccion === "PP" ? `+${trade.roiProtegido}%` : `-${trade.slInicial}%`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
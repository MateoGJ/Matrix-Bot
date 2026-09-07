"use client"

import { useState } from "react"
import { BotSummary } from "@/lib/bot-api"

interface BotListSidebarProps {
  bots: BotSummary[]
  selectedBotId: string | null
  onSelectBot: (id: string) => void
}

type SortOption = "ACTIVE_TRADE" | "PNL_DESC" | "ROI_DESC" | "SL_DESC" | "ONLINE_ONLY" | "RECENT"

export function BotListSidebar({ bots, selectedBotId, onSelectBot }: BotListSidebarProps) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("ACTIVE_TRADE")

  const processedBots = [...(bots || [])]
    .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    .filter((b) => sortBy === "ONLINE_ONLY" ? b.status === "ONLINE" : true)
    .sort((a, b) => {
      if (sortBy === "ACTIVE_TRADE") {
        const aTrade = a.activeTrade ? 1 : 0
        const bTrade = b.activeTrade ? 1 : 0
        if (bTrade !== aTrade) return bTrade - aTrade
        return b.totalPnl - a.totalPnl
      }
      if (sortBy === "PNL_DESC") return b.totalPnl - a.totalPnl
      if (sortBy === "ROI_DESC") {
        const aRoi = a.balance > 0 ? (a.totalPnl / a.balance) : 0
        const bRoi = b.balance > 0 ? (b.totalPnl / b.balance) : 0
        return bRoi - aRoi
      }
      if (sortBy === "SL_DESC") {
        // Lee el ADN del bot para filtrar por el stop loss más agresivo[cite: 19]
        const aSl = a.rawConfig?.sl_porcentaje || 0
        const bSl = b.rawConfig?.sl_porcentaje || 0
        return bSl - aSl
      }
      if (sortBy === "RECENT") {
        const aTime = a.activeTrade?.fechaInicio ? new Date(a.activeTrade.fechaInicio).getTime() : 0
        const bTime = b.activeTrade?.fechaInicio ? new Date(b.activeTrade.fechaInicio).getTime() : 0
        if (bTime !== aTime) return bTime - aTime
        return b.totalPnl - a.totalPnl
      }
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="flex flex-col h-full w-full bg-black/70 border-r border-white/5 font-mono text-sm relative">
      
      {/* HEADER SIDEBAR: Sticky (Queda fijo arriba al scrollear en celular) */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md p-4 border-b border-white/35 space-y-4 shrink-0 shadow-xl">
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
        
        {/* FILTROS RÁPIDOS: Scroll Horizontal para celular */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 pt-1 -mx-2 px-2">
          <button onClick={() => setSortBy("ACTIVE_TRADE")} className={`shrink-0 text-[10px] px-3 py-1.5 rounded font-bold tracking-widest uppercase transition-colors border ${sortBy === "ACTIVE_TRADE" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 text-gray-500 border-white/5 hover:bg-white/10"}`}>
            All
          </button>
          <button onClick={() => setSortBy("ROI_DESC")} className={`shrink-0 text-[10px] px-3 py-1.5 rounded font-bold tracking-widest uppercase transition-colors border ${sortBy === "ROI_DESC" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-white/5 text-gray-500 border-white/5 hover:bg-white/10"}`}>
            ROI
          </button>
          <button onClick={() => setSortBy("SL_DESC")} className={`shrink-0 text-[10px] px-3 py-1.5 rounded font-bold tracking-widest uppercase transition-colors border ${sortBy === "SL_DESC" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/5 text-gray-500 border-white/5 hover:bg-white/10"}`}>
            SL
          </button>
          <button onClick={() => setSortBy("RECENT")} className={`shrink-0 text-[10px] px-3 py-1.5 rounded font-bold tracking-widest uppercase transition-colors border ${sortBy === "RECENT" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-white/5 text-gray-500 border-white/5 hover:bg-white/10"}`}>
            Lasts
          </button>
          <button onClick={() => setSortBy("ONLINE_ONLY")} className={`shrink-0 text-[10px] px-3 py-1.5 rounded font-bold tracking-widest uppercase transition-colors border ${sortBy === "ONLINE_ONLY" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/5 text-gray-500 border-white/5 hover:bg-white/10"}`}>
            On
          </button>
        </div>
      </div>

      {/* LISTA DE BOTS: Diseño intacto */}
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
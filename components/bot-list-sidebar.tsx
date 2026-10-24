"use client"

import { useState, useEffect } from "react"
import { BotSummary, getBotVersionHistory } from "@/lib/bot-api"

interface BotListSidebarProps {
  bots: BotSummary[]
  selectedBotId: string | null
  onSelectBot: (id: string) => void
}

type TabMode = "LIVE" | "ARCHIVE"

export function BotListSidebar({ bots, selectedBotId, onSelectBot }: BotListSidebarProps) {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<TabMode>("LIVE")
  const [latestPnlData, setLatestPnlData] = useState<Record<string, number>>({})

  const opsHash = (bots || []).map(b => b.totalOperations).join(",")

  useEffect(() => {
    let mounted = true
    const fetchLatestPnl = async () => {
      if (!bots || bots.length === 0) return
      const newData: Record<string, number> = {}
      
      await Promise.all(
        bots.map(async (bot) => {
          try {
            const history = await getBotVersionHistory(bot.id)
            if (history && history.length > 0) {
              newData[bot.id] = history[0].pnl 
            } else {
              newData[bot.id] = bot.totalPnl
            }
          } catch (e) {
            newData[bot.id] = bot.totalPnl
          }
        })
      )
      
      if (mounted) setLatestPnlData(newData)
    }
    
    fetchLatestPnl()
    return () => { mounted = false }
  }, [opsHash])

  // Filtramos por pestaña y búsqueda
  const processedBots = (bots || [])
    .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    .filter((b) => tab === "LIVE" ? b.status === "ONLINE" : b.status === "OFFLINE")
    .sort((a, b) => {
      const aTrade = a.activeTrade ? 1 : 0
      const bTrade = b.activeTrade ? 1 : 0
      if (bTrade !== aTrade) return bTrade - aTrade
      
      const aPnl = latestPnlData[a.id] ?? a.totalPnl
      const bPnl = latestPnlData[b.id] ?? b.totalPnl
      return bPnl - aPnl
    })

  return (
    <div className="flex flex-col h-full w-full bg-black border-r border-white/5 font-mono relative select-none">
      
      {/* HEADER TERMINAL */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md p-3 border-b border-white/10 shrink-0 shadow-xl">
        <div className="flex w-full mb-3 gap-2">
          <button 
            onClick={() => setTab("LIVE")} 
            className={`flex-1 text-xs font-bold tracking-widest uppercase py-2 border transition-colors rounded ${tab === "LIVE" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 text-zinc-600 border-white/5 hover:text-zinc-300 hover:bg-white/10"}`}
          >
            [ LIVE ]
          </button>
          <button 
            onClick={() => setTab("ARCHIVE")} 
            className={`flex-1 text-xs font-bold tracking-widest uppercase py-2 border transition-colors rounded ${tab === "ARCHIVE" ? "bg-zinc-800 text-white border-zinc-600" : "bg-white/5 text-zinc-600 border-white/5 hover:text-zinc-300 hover:bg-white/10"}`}
          >
            [ ARCHIVO ]
          </button>
        </div>
        <input
          type="text"
          placeholder="> Rastrear nodo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900/80 border border-white/10 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 rounded transition-colors"
        />
      </div>

      {/* LISTA DE BOTS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {processedBots.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-700 uppercase tracking-widest mt-4">Sin registros</div>
        ) : (
          processedBots.map((bot) => {
            const isSelected = bot.id === selectedBotId
            const trade = bot.activeTrade
            
            const botPnl = latestPnlData[bot.id] ?? bot.totalPnl
            const botRoi = botPnl * 100 

            return (
              <button
                key={bot.id}
                onClick={() => onSelectBot(bot.id)}
                className={`w-full text-left p-3 border transition-all duration-200 rounded-lg flex flex-col gap-2 ${
                  isSelected 
                    ? "bg-zinc-900 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                    : "bg-black hover:bg-zinc-900/40 border-white/5"
                }`}
              >
                {/* FILA 1: BOT DATA (Balance y ROI Global) */}
                <div className="flex items-center justify-between w-full pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2 truncate">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${bot.status === "ONLINE" ? (trade ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "bg-green-500") : "bg-red-900"}`} />
                    <span className={`text-sm font-black tracking-wide truncate ${isSelected ? "text-white" : "text-zinc-300"}`}>
                      {bot.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                      BAL: <span className="text-white">${bot.balance?.toFixed(2) || "0.00"}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                      Bot: <span className={`text-sm font-black ${botRoi >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {botRoi >= 0 ? "+" : ""}{botRoi.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>

                {/* FILA 2: TRADE DATA O MONITOREO */}
                {trade ? (
                  <div className="flex items-center justify-between w-full pt-1">
                    <div className="flex items-center gap-2 text-xs font-bold truncate">
                      <span className={trade.tipo === "BUY" ? "text-green-400" : "text-red-400"}>{trade.tipo}</span>
                      <span className="text-white">{trade.symbol}</span>
                      {trade.apalancamiento && (
                        <span className="text-[9px] bg-lime-500/20 text-lime-400 border border-lime-500/30 px-1.5 py-0.5 rounded">
                          {trade.apalancamiento}X
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-900/30 shrink-0">
                      <span className="text-[10px] text-cyan-600 uppercase tracking-widest font-bold">Op:</span>
                      <span className={`text-xs font-black ${trade.pnlPct >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                        {trade.pnlPct >= 0 ? "+" : ""}{trade.pnlPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-start w-full pt-1">
                    <span className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 ${bot.status === "ONLINE" ? "text-zinc-500" : "text-red-900/50"}`}>
                       {bot.status === "ONLINE" && <span className="h-1 w-1 bg-zinc-500 rounded-full animate-ping"></span>}
                       {bot.status === "ONLINE" ? "Monitoreando..." : "Apagado"}
                    </span>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
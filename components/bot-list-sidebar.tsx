"use client"

import { useState } from "react"
import { BotSummary } from "@/lib/bot-api"

interface BotListSidebarProps { bots: BotSummary[]; selectedBotId: string | null; onSelectBot: (id: string) => void }
type SortOption = "ACTIVE_FIRST" | "PNL_DESC" | "NAME"

export function BotListSidebar({ bots, selectedBotId, onSelectBot }: BotListSidebarProps) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("ACTIVE_FIRST")
  const processedBots = [...(bots || [])].filter((b) => b.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (sortBy === "ACTIVE_FIRST") { const aTrade = a.activeTrade ? 1 : 0; const bTrade = b.activeTrade ? 1 : 0; if (bTrade !== aTrade) return bTrade - aTrade; return b.totalPnl - a.totalPnl }
    if (sortBy === "PNL_DESC") return b.totalPnl - a.totalPnl
    return a.name.localeCompare(b.name)
  })
  return <div className="flex h-full w-full flex-col bg-sidebar/75 font-mono text-sm">
    <div className="shrink-0 border-b border-sidebar-border/70 p-4">
      <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Fleet selector</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-sidebar-foreground">Nodos activos <span className="text-primary">({bots?.length || 0})</span></p></div><span className="status-dot size-2 rounded-full bg-chart-2" /></div>
      <div className="flex gap-2"><input aria-label="Buscar bot" type="text" placeholder="Buscar bot..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-md border border-sidebar-border bg-secondary/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" /><select aria-label="Ordenar bots" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="w-24 rounded-md border border-sidebar-border bg-secondary/60 px-2 text-[10px] text-muted-foreground focus:border-primary focus:outline-none"><option value="ACTIVE_FIRST">Activos</option><option value="PNL_DESC">PNL</option><option value="NAME">Nombre</option></select></div>
    </div>
    <div className="custom-scrollbar flex-1 overflow-y-auto">
      {processedBots.length === 0 ? <div className="p-6 text-center text-xs text-muted-foreground">Ningún bot encontrado</div> : processedBots.map((bot) => {
        const isSelected = bot.id === selectedBotId; const trade = bot.activeTrade; const botRoi = bot.balance > 0 ? (bot.totalPnl / bot.balance) * 100 : 0
        return <button key={bot.id} onClick={() => onSelectBot(bot.id)} className={`relative block w-full border-b border-sidebar-border/60 p-4 text-left ${isSelected ? "bg-primary/10" : "hover:bg-secondary/60"}`}>
          {isSelected && <div className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
          <div className="mb-3 flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${bot.status === "ONLINE" ? "status-dot bg-chart-2" : "bg-destructive"}`} /><span className={`text-sm font-bold tracking-wide ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{bot.name}</span></div><div className="text-right text-[10px] leading-4"><div className="text-muted-foreground">BAL <span className="text-foreground">${bot.balance?.toFixed(2)}</span></div><div className={botRoi >= 0 ? "text-chart-2" : "text-destructive"}>ROI {botRoi >= 0 ? "+" : ""}{botRoi.toFixed(2)}% <span className="text-muted-foreground">/</span> PNL {bot.totalPnl >= 0 ? "+" : ""}${bot.totalPnl?.toFixed(2)}</div></div></div>
          {trade && <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/45 px-2.5 py-2 text-[10px] font-bold"><div className="flex gap-2"><span className={trade.tipo === "BUY" ? "text-chart-2" : "text-destructive"}>{trade.tipo}</span><span className="text-foreground">{trade.symbol}</span><span className="text-primary">${trade.margen?.toFixed(2)}</span></div><div className="text-right"><span className={trade.pnlPct >= 0 ? "text-chart-2" : "text-destructive"}>{trade.pnlPct >= 0 ? "+" : ""}{trade.pnlPct?.toFixed(2)}%</span><span className="mx-1 text-muted-foreground">/</span><span className={trade.estadoProteccion === "PP" ? "text-chart-2" : "text-destructive"}>{trade.estadoProteccion}</span></div></div>}
        </button>
      })}
    </div>
  </div>
}

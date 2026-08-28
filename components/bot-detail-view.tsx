"use client"

import { useState } from "react"
import { BotSummary } from "@/lib/bot-api"
import { OperationsTable } from "./operations-table"
import { MonthlyCalendar } from "./monthly-calendar"
import { BotVersionConfig } from "./bot-version-config"

export function BotDetailView({ bot }: { bot: BotSummary }) {
  const [activeTab, setActiveTab] = useState<"OPERATIONS" | "MONTHLY" | "CONFIG">("OPERATIONS")
  
  const trade = bot.activeTrade
  const botRoi = bot.balance > 0 ? (bot.totalPnl / bot.balance) * 100 : 0

  // 🧬 Extracción del ADN (CONFIG)
  const config = bot.rawConfig || {}
  const experimentName = config.experiment || "N/A"
  const strategyDesc = config.estrategia_desc || "No hay descripción disponible para esta versión."

  const mockVersions = [{
      version: bot.version,
      fecha: "En Vivo",
      operaciones: bot.totalOperations,
      winRate: bot.winRate,
      pnl: bot.totalPnl,
      config: config
  }]

  // Formatear la fecha para el radar (dd/mm hh:mm)
  const formatRadarDate = (isoString?: string) => {
    if (!isoString) return ""
    const d = new Date(isoString)
    return d.toLocaleString("es-AR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 font-mono sm:p-5">
      
      {/* HEADER DEL BOT */}
      <div className="flex shrink-0 flex-col items-start justify-between gap-5 border-b border-border/60 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{bot.name}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${bot.status === "ONLINE" ? "text-foreground bg-foreground/10 border border-border" : "text-muted-foreground bg-muted/30 border border-border"}`}>
              {bot.status}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-bold tracking-widest">VER: {bot.version}</span>
        </div>

        <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:w-auto sm:grid-cols-4 sm:gap-x-5">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block uppercase tracking-widest mb-0.5">Balance</span>
            <span className="text-lg font-bold text-white">${bot.balance?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden md:block"></div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block uppercase tracking-widest mb-0.5">PnL Total</span>
            <span className={`text-lg font-bold ${bot.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              {bot.totalPnl >= 0 ? "+" : ""}${bot.totalPnl?.toFixed(2) || "0.00"}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden md:block"></div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block uppercase tracking-widest mb-0.5">ROI Bot</span>
            <span className={`text-lg font-bold ${botRoi >= 0 ? "text-green-400" : "text-red-400"}`}>
              {botRoi >= 0 ? "+" : ""}{botRoi.toFixed(2)}%
            </span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden md:block"></div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block uppercase tracking-widest mb-0.5">Total Ops</span>
            <span className="text-lg font-bold text-white">{bot.totalOperations}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN MEDIA: ADN (Izq) + RADAR (Der) */}
      <div className="flex flex-col xl:flex-row gap-6 shrink-0">
        
        {/* PANEL IZQUIERDO: Descripciones y Experimento */}
        <div className="min-w-0 flex-1 rounded-lg border border-border/50 bg-transparent p-4">
          <h3 className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4 flex items-center space-x-2">
            <span>ADN / ESTRATEGIA</span>
          </h3>
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase tracking-widest mb-1">Experimento Activo:</span>
              <span className="text-sm font-bold text-foreground">{experimentName}</span>
            </div>
            <div>
              {/* 👈 ACÁ CAMBIÉ text-teal-400 a text-white */}
              <p className="text-xs text-white leading-relaxed max-w-2xl">
                {strategyDesc}
              </p>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Operación Activa Compacta */}
        <div className="w-full shrink-0 rounded-lg border border-border/50 bg-transparent p-4 xl:w-[350px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center space-x-2">
              <span className={`h-1.5 w-1.5 rounded-full ${trade ? (trade.estadoProteccion === 'PP' ? 'bg-green-400 animate-ping' : 'bg-cyan-400 animate-ping') : 'bg-teal-600'}`} />
              <span>RADAR EN VIVO</span>
            </h3>
            {/* 👈 ACÁ AGREGUÉ LA FECHA CHIQUITITA dd/mm 00:00 */}
            {trade?.fechaInicio && (
              <span className="text-[9px] text-muted-foreground font-bold tracking-widest">
                {formatRadarDate(trade.fechaInicio)}
              </span>
            )}
          </div>

          {trade ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className={`text-sm font-bold ${trade.tipo === "BUY" ? "text-green-400" : "text-red-400"}`}>
                  {trade.tipo}
                </span>
                <span className="text-sm font-bold text-white">{trade.symbol}</span>
                <span className="text-sm font-bold text-foreground">{trade.apalancamiento}</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground uppercase tracking-widest text-[9px]">Margen</span>
                <span className="text-sky-300 font-bold">${trade.margen?.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground uppercase tracking-widest text-[9px]">ROI</span>
                <span className={`font-bold ${trade.pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {trade.pnlPct >= 0 ? "+" : ""}{trade.pnlPct?.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground uppercase tracking-widest text-[9px]">PNL</span>
                <span className={`font-bold ${trade.pnlActual >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {trade.pnlActual >= 0 ? "+" : ""}{trade.pnlActual?.toFixed(2)}%
                </span>
              </div>
              
              <div className={`mt-2 px-3 py-2 rounded border flex justify-between items-center ${trade.estadoProteccion === "PP" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${trade.estadoProteccion === "PP" ? "text-green-500" : "text-red-500"}`}>
                  {trade.estadoProteccion === "PP" ? "PP Asegurado" : "SL Riesgo"}
                </span>
                <span className={`text-sm font-bold ${trade.estadoProteccion === "PP" ? "text-green-400" : "text-red-400"}`}>
                  {trade.estadoProteccion === "PP" ? "+" : ""}{trade.estadoProteccion === "PP" ? trade.roiProtegido?.toFixed(2) : `-${trade.slInicial}`}%
                </span>
                <span className={`text-sm font-bold ${trade.estadoProteccion === "PP" ? "text-green-400" : "text-red-400"}`}>
                  {trade.estadoProteccion === "PP" ? "+" : ""}{trade.estadoProteccion === "PP" ? trade.pnlAsegurado?.toFixed(2) : `-${trade.pnlSl?.toFixed(2)}`}$
                </span>
              </div>
            </div>
          ) : (
            <div className="text-teal-600 text-[10px] font-bold uppercase tracking-widest text-center py-4">
              NINGÚN OBJETIVO EN LA MIRA.
            </div>
          )}
        </div>

      </div>

      {/* PESTAÑAS (Fill height) */}
      <div className="flex flex-col flex-1">
        <div className="flex gap-5 border-b border-border/50 pb-2 mt-2 shrink-0">
          <button onClick={() => setActiveTab("OPERATIONS")} className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "OPERATIONS" ? "text-foreground border-b-2 border-sky-400" : "text-teal-600 hover:text-sky-300"}`}>Operaciones</button>
          <button onClick={() => setActiveTab("MONTHLY")} className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "MONTHLY" ? "text-foreground border-b-2 border-sky-400" : "text-teal-600 hover:text-sky-300"}`}>Overview</button>
          <button onClick={() => setActiveTab("CONFIG")} className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "CONFIG" ? "text-foreground border-b-2 border-sky-400" : "text-teal-600 hover:text-sky-300"}`}>Configuración</button>
        </div>

        <div className="pt-4 flex-1 overflow-y-auto">
          {activeTab === "OPERATIONS" && <OperationsTable botId={bot.id} />}
          {activeTab === "MONTHLY" && <MonthlyCalendar botId={bot.id} />}
          {activeTab === "CONFIG" && <BotVersionConfig botName={bot.name} versions={mockVersions} />}
        </div>
      </div>
      
    </div>
  )
}

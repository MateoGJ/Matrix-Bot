"use client"

import { useState, useEffect, useMemo } from "react"
import {
  getDailyPnl,
  getMonthlyStats,
  getBotStats,
  getBotVersionHistory,
  type BotId,
  type MonthlyStats,
  type Stats,
} from "@/lib/bot-api"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts"

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

// 🔥 TOOLTIP TERMINAL
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value
    const isProfit = val >= 0
    return (
      <div className={`p-3 rounded border backdrop-blur-md shadow-2xl transition-all bg-black/95 ${
        isProfit ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
      }`}>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
        <p className={`font-black text-lg ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
          {val >= 0 ? "+" : ""}{val.toFixed(2)} $
        </p>
      </div>
    )
  }
  return null
}

export function MonthlyCalendar({ botId }: { botId: BotId }) {
  const [isMounted, setIsMounted] = useState(false)
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  
  const [dailyPnl, setDailyPnl] = useState<Record<number, number>>({})
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [botStats, setBotStats] = useState<Stats | null>(null)
  
  const [versions, setVersions] = useState<any[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>("ALL")

  const [loadingDaily, setLoadingDaily] = useState(true)
  const [loadingGlobal, setLoadingGlobal] = useState(true)
  const [curveType, setCurveType] = useState<"MONTHLY" | "DAILY">("MONTHLY")

  useEffect(() => {
    setIsMounted(true)
    getBotVersionHistory(botId).then(data => {
      setVersions(data)
      if (data.length > 0) {
        setSelectedVersion(data[0].version)
      }
    })
  }, [botId])

  useEffect(() => {
    if (!isMounted) return
    const loadDailyPnl = async () => {
      setLoadingDaily(true)
      try {
        // @ts-ignore
        const data = await getDailyPnl(botId, currentYear, currentMonth, selectedVersion !== "ALL" ? selectedVersion : undefined)
        setDailyPnl(data)
      } catch (error) {
        setDailyPnl({})
      } finally {
        setLoadingDaily(false)
      }
    }
    loadDailyPnl()
  }, [botId, currentMonth, currentYear, isMounted, selectedVersion])

  useEffect(() => {
    if (!isMounted) return
    const loadGlobalStats = async () => {
      setLoadingGlobal(true)
      try {
        const [mStats, bStats] = await Promise.all([
          // @ts-ignore
          getMonthlyStats(botId, selectedVersion !== "ALL" ? selectedVersion : undefined),
          // @ts-ignore
          getBotStats(botId, selectedVersion !== "ALL" ? selectedVersion : undefined)
        ])
        setMonthlyStats(mStats)
        setBotStats(bStats)
      } catch (error) {
        console.error("Error loading global stats:", error)
      } finally {
        setLoadingGlobal(false)
      }
    }
    loadGlobalStats()
  }, [botId, isMounted, selectedVersion])

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay()

  const activeVersionData = versions.find(v => v.version === selectedVersion)
  const pnlToShow = selectedVersion === "ALL" ? (botStats?.totalPnl || 0) : (activeVersionData?.pnl || 0)
  const opsToShow = selectedVersion === "ALL" ? (botStats?.totalOperations || 0) : (activeVersionData?.operaciones || 0)
  const winRateToShow = selectedVersion === "ALL" ? (botStats?.winRate || 0) : (activeVersionData?.winRate || 0)
  const roiToShow = pnlToShow * 100 

  const chartData = useMemo(() => {
    if (curveType === "MONTHLY") {
      if (!monthlyStats.length) return []
      const reversed = [...monthlyStats].reverse()
      let equity = 0
      const data = [{ name: "Inicio", equity: 0 }]
      
      reversed.forEach(stat => {
        equity += stat.pnl
        data.push({
          name: `${monthNames[stat.month - 1].slice(0, 3)} '${stat.year.toString().slice(2)}`,
          equity: Number(equity.toFixed(2))
        })
      })
      return data
    } else {
      const data = [{ name: "Inicio", equity: 0 }]
      let equity = 0
      const days = new Date(currentYear, currentMonth, 0).getDate()
      
      let lastDayWithData = 0
      for (let i = 1; i <= days; i++) {
        if (dailyPnl[i] !== undefined) lastDayWithData = i
      }
      
      const todayDate = new Date()
      const isCurrentMonth = todayDate.getMonth() + 1 === currentMonth && todayDate.getFullYear() === currentYear
      const limitDay = isCurrentMonth ? todayDate.getDate() : (lastDayWithData || days)

      for (let i = 1; i <= limitDay; i++) {
        if (dailyPnl[i] !== undefined) {
          equity += dailyPnl[i]
        }
        data.push({
          name: `${monthNames[currentMonth - 1].slice(0, 3)} ${i}`, // Formato: Oct 1, Oct 2
          equity: Number(equity.toFixed(2))
        })
      }
      return data
    }
  }, [monthlyStats, curveType, dailyPnl, currentMonth, currentYear])

  // Cálculo matemático para cortar el color exactamente en la línea de $0
  const gradientOffset = useMemo(() => {
    if (!chartData.length) return 0
    const dataMax = Math.max(...chartData.map((i) => i.equity))
    const dataMin = Math.min(...chartData.map((i) => i.equity))
    
    if (dataMax <= 0) return 0 // Todo por debajo de 0 (Rojo)
    if (dataMin >= 0) return 1 // Todo por encima de 0 (Verde)
    
    return dataMax / (dataMax - dataMin)
  }, [chartData])

  const renderCalendarDays = () => {
    const days = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="bg-transparent" />)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const pnl = dailyPnl[day]
      const hasData = pnl !== undefined
      const isProfit = hasData && pnl > 0
      const isLoss = hasData && pnl < 0

      days.push(
        <div
          key={day}
          className={`aspect-square rounded flex flex-col items-center justify-center p-1 border transition-all
            ${
              hasData
                ? isProfit
                  ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                  : isLoss
                  ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                  : "bg-zinc-500/10 border-zinc-500/30 hover:bg-zinc-500/20"
                : "bg-zinc-900/30 border-white/5 hover:bg-white/5"
            }`}
        >
          <span className={`text-[10px] font-bold ${hasData ? 'text-white' : 'text-zinc-600'}`}>
            {day}
          </span>
          {hasData && (
            <span className={`text-[10px] font-black mt-0.5 ${isProfit ? "text-green-400" : isLoss ? "text-red-400" : "text-zinc-400"}`}>
              {pnl > 0 ? "+" : ""}{pnl.toFixed(1)}$
            </span>
          )}
        </div>
      )
    }
    return days
  }

  if (!isMounted) return null

  return (
    <div className="flex flex-col w-full space-y-4 font-mono select-none">
      
      {/* 🧬 HEADER Y SELECTOR DE VERSIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black border border-white/5 p-4 rounded">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">ANÁLISIS DE RENDIMIENTO</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white font-bold">{selectedVersion === "ALL" ? "Historial Completo" : "Métricas de Versión Aislada"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">VERSIÓN:</span>
          <select 
            value={selectedVersion} 
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="bg-zinc-900 border border-white/10 text-xs text-cyan-400 font-bold px-3 py-1.5 rounded outline-none focus:border-cyan-500 cursor-pointer"
          >
            {versions.map(v => (
              <option key={v.version} value={v.version}>{v.version}</option>
            ))}
            <option value="ALL">GLOBAL (Todas)</option>
          </select>
        </div>
      </div>

      {/* 📊 TARJETAS DE ESTADÍSTICAS (Grid de 4, sin PNL/Op) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-black border border-white/5 p-4 rounded flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">PNL NETO</span>
          {/* PNL Dorado (Amber) para ganancia, Rojo para pérdida */}
          <span className={`text-xl font-black ${pnlToShow >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
            {pnlToShow >= 0 ? '+' : ''}{pnlToShow.toFixed(2)}$
          </span>
        </div>
        <div className="bg-black border border-white/5 p-4 rounded flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">ROI (BASE $1)</span>
          {/* ROI Verde / Rojo */}
          <span className={`text-xl font-black ${roiToShow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {roiToShow >= 0 ? '+' : ''}{roiToShow.toFixed(1)}%
          </span>
        </div>
        <div className="bg-black border border-white/5 p-4 rounded flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">WIN RATE</span>
          {/* WinRate Azul */}
          <span className="text-xl font-black text-blue-400">
            {winRateToShow.toFixed(1)}%
          </span>
        </div>
        <div className="bg-black border border-white/5 p-4 rounded flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">TOTAL OPS</span>
          {/* Ops Blanco */}
          <span className="text-xl font-black text-white">
            {opsToShow}
          </span>
        </div>
      </div>

      {/* 📈 CURVA DE EQUITY (CHART) - AHORA ARRIBA Y ANCHO COMPLETO */}
      <div className="bg-black border border-white/5 rounded p-4 h-[350px] flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 border-b border-white/10 pb-4">
          <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="text-cyan-500 animate-pulse">●</span> CURVA DE RENDIMIENTO
          </h3>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setCurveType("MONTHLY")} 
              className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border transition-colors rounded ${curveType === "MONTHLY" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-zinc-900/50 text-zinc-600 border-white/5 hover:text-zinc-300"}`}
            >
              [ MENSUAL ]
            </button>
            <button 
              onClick={() => setCurveType("DAILY")} 
              className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border transition-colors rounded ${curveType === "DAILY" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-zinc-900/50 text-zinc-600 border-white/5 hover:text-zinc-300"}`}
            >
              [ DIARIO ]
            </button>
          </div>
        </div>
        
        <div className="flex-1 w-full min-h-[220px]">
          {loadingGlobal ? (
            <div className="w-full h-full animate-pulse bg-zinc-900/20 rounded flex items-center justify-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
              Renderizando Gráfico...
            </div>
          ) : chartData.length < 2 ? (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs font-bold uppercase tracking-widest border border-dashed border-white/5 rounded">
              Sin datos suficientes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {/* Gradiente dinámico: Verde por encima de 0, Rojo por debajo */}
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={0.6} />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="#4ade80" stopOpacity={0.1} />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="#f87171" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0.6} />
                  </linearGradient>
                  
                  {/* Borde del gráfico adaptativo */}
                  <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="#4ade80" stopOpacity={1} />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="#f87171" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#ffffff0a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  fontFamily="monospace"
                  dy={10}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val.toFixed(0)}`}
                  fontFamily="monospace"
                  width={50}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.5 }}
                />
                
                <ReferenceLine 
                  y={0} 
                  stroke="#52525b" 
                  strokeWidth={1} 
                  strokeDasharray="4 4" 
                  opacity={0.8} 
                />
                
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="url(#splitStroke)"
                  strokeWidth={2}
                  fill="url(#splitColor)"
                  baseValue={0}
                  dot={false}
                  activeDot={{ r: 5, fill: '#fff', strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 📅 CALENDARIO Y REGISTRO MENSUAL - ABAJO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* CALENDARIO */}
        <div className="lg:col-span-2 bg-black border border-white/5 p-4 rounded">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <button onClick={() => {
              if (currentMonth > 1) setCurrentMonth(currentMonth - 1)
              else { setCurrentMonth(12); setCurrentYear(currentYear - 1) }
            }} className="text-zinc-500 hover:text-white px-3 py-1 bg-zinc-900/50 rounded border border-white/5 transition">{"<"}</button>
            
            <div className="text-xs font-bold text-white uppercase tracking-widest">
              {monthNames[currentMonth - 1]} {currentYear}
            </div>

            <button onClick={() => {
              if (currentMonth < 12) setCurrentMonth(currentMonth + 1)
              else { setCurrentMonth(1); setCurrentYear(currentYear + 1) }
            }} className="text-zinc-500 hover:text-white px-3 py-1 bg-zinc-900/50 rounded border border-white/5 transition">{">"}</button>
          </div>

          {loadingDaily ? (
            <div className="animate-pulse grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => <div key={i} className="aspect-square bg-zinc-900/50 rounded border border-white/5" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(d => <div key={d} className="text-center text-zinc-500 font-bold text-[9px] uppercase tracking-wider">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarDays()}
              </div>
            </>
          )}
        </div>

        {/* LISTA MENSUAL */}
        <div className="lg:col-span-1 bg-black border border-white/5 p-4 rounded h-full min-h-[200px]">
          <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
            HISTÓRICO MENSUAL
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {loadingGlobal ? (
              <div className="animate-pulse space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-zinc-900/50 rounded" />)}
              </div>
            ) : monthlyStats.length === 0 ? (
              <div className="text-center text-zinc-600 text-[10px] py-6 uppercase tracking-widest">Sin registros</div>
            ) : (
              monthlyStats.map((stat, i) => (
                <div key={i} className="bg-zinc-900/30 border border-white/5 rounded p-2 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-white font-bold capitalize">{monthNames[stat.month - 1]} {stat.year}</div>
                    <div className="text-[9px] text-zinc-500 font-bold">{stat.operations} OPS</div>
                  </div>
                  <div className={`text-xs font-black ${stat.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {stat.pnl >= 0 ? "+" : ""}{stat.pnl.toFixed(2)}$
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
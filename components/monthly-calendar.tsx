"use client"

import { useState, useEffect, useMemo } from "react"
import {
  getDailyPnl,
  getMonthlyStats,
  getBotStats,
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

// 🔥 TOOLTIP CUSTOMIZADO
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value
    const isProfit = val >= 0
    return (
      <div className={`p-3 rounded-lg border backdrop-blur-md shadow-2xl transition-all ${
        isProfit 
          ? 'bg-green-500/10 border-green-500/50 shadow-green-500/20' 
          : 'bg-red-500/10 border-red-500/50 shadow-red-500/20'
      }`}>
        <p className={`font-mono font-bold text-xl ${
          isProfit ? 'text-green-400' : 'text-red-400'
        }`}>
          {val.toFixed(2)} $
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
  
  const [loadingDaily, setLoadingDaily] = useState(true)
  const [loadingGlobal, setLoadingGlobal] = useState(true)

  // Prevenir Hydration Error
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Carga diaria
  useEffect(() => {
    if (!isMounted) return
    const loadDailyPnl = async () => {
      setLoadingDaily(true)
      try {
        const data = await getDailyPnl(botId, currentYear, currentMonth)
        setDailyPnl(data)
      } catch (error) {
        console.error("Error loading daily PNL:", error)
        setDailyPnl({})
      } finally {
        setLoadingDaily(false)
      }
    }
    loadDailyPnl()
  }, [botId, currentMonth, currentYear, isMounted])

  // Carga global
  useEffect(() => {
    if (!isMounted) return
    const loadGlobalStats = async () => {
      setLoadingGlobal(true)
      try {
        const [mStats, bStats] = await Promise.all([
          getMonthlyStats(botId),
          getBotStats(botId)
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
  }, [botId, isMounted])

  // Cálculos de calendario
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay()

  // Métricas derivadas únicamente de datos reales de TiDB.
  const avgPnlPerOperation = botStats && botStats.totalOperations > 0
    ? botStats.totalPnl / botStats.totalOperations
    : 0

  // Cálculo de la Equity Curve
  const chartData = useMemo(() => {
    if (!monthlyStats.length) return []
    
    const reversed = [...monthlyStats].reverse()
    let equity = 0
    const data = [{ name: "Inicio", equity: 0 }]
    
    reversed.forEach(stat => {
      equity += stat.pnl
      data.push({
        name: `${monthNames[stat.month - 1].slice(0, 3)} ${stat.year.toString().slice(2)}`,
        equity: Number(equity.toFixed(2))
      })
    })
    
    return data
  }, [monthlyStats])

  // Calculamos dónde está la línea de break-even (0 USDT)
  const gradientOffset = useMemo(() => {
    if (!chartData.length) return 0
    const dataMax = Math.max(...chartData.map((i) => i.equity))
    const dataMin = Math.min(...chartData.map((i) => i.equity))

    if (dataMax <= 0) return 0 // Todo pérdida (todo rojo)
    if (dataMin >= 0) return 1 // Todo ganancia (todo verde)

    return (dataMax) / (dataMax - dataMin)
  }, [chartData])

  const renderCalendarDays = () => {
    const days = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} />)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const pnl = dailyPnl[day]
      const hasData = pnl !== undefined
      const isProfit = hasData && pnl > 0

      days.push(
        <div
          key={day}
          className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-2 transition
            ${
              hasData
                ? isProfit
                  ? "bg-green-500/10 border-green-500/50"
                  : "bg-red-500/10 border-red-500/50"
                : "bg-white/10 border-white/20"
            }`}
        >
          <span className="font-mono font-bold text-lg text-white">
            {day}
          </span>
          <span
            className={`font-mono text-xs mt-1 ${
              !hasData
                ? "text-gray-400"
                : isProfit
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {hasData ? `${pnl > 0 ? "+" : ""}${pnl.toFixed(2)}$` : "0.00$"}
          </span>
        </div>,
      )
    }
    return days
  }

  if (!isMounted) return null

  return (
    <section id="history" className="py-16 px-0">
      <div className="container mx-auto max-w-[1400px]">
        <div className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg overflow-hidden flex flex-col">
          
          {/* HEADER */}
          <div className="border-b border-white/20 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-3xl font-bold font-mono">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {">"} Desempeño Operativo
                </span>
              </h2>

              <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
                BOT: <span className="text-white">{botId}</span>
              </div>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/20 items-stretch">
            
            {/* LEFT: CALENDAR SECTION */}
            <div className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold font-mono text-white/80">
                  Calendario Diario
                </h3>
                <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
                  <button
                    onClick={() => {
                      if (currentMonth > 1) setCurrentMonth(currentMonth - 1)
                      else {
                        setCurrentMonth(12)
                        setCurrentYear(currentYear - 1)
                      }
                    }}
                    className="text-white hover:text-gray-300 font-mono text-xl transition"
                  >
                    {"<"}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-lg font-bold">
                      {currentYear}
                    </span>
                    <select
                      value={currentMonth}
                      onChange={e => setCurrentMonth(Number(e.target.value))}
                      className="bg-transparent border-none text-white font-mono outline-none cursor-pointer appearance-none text-center"
                    >
                      {monthNames.map((m, i) => (
                        <option key={i} value={i + 1} className="bg-gray-900">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      if (currentMonth < 12) setCurrentMonth(currentMonth + 1)
                      else {
                        setCurrentMonth(1)
                        setCurrentYear(currentYear + 1)
                      }
                    }}
                    className="text-white hover:text-gray-300 font-mono text-xl transition"
                  >
                    {">"}
                  </button>
                </div>
              </div>

              {loadingDaily ? (
                <div className="animate-pulse grid grid-cols-7 gap-2">
                  {[...Array(35)].map((_, i) => (
                    <div key={i} className="aspect-square bg-white/5 rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {dayNames.map(d => (
                      <div
                        key={d}
                        className="text-center text-gray-400 font-mono text-xs uppercase tracking-wider font-bold"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {renderCalendarDays()}
                  </div>
                </>
              )}
            </div>

            {/* RIGHT: MONTHLY HISTORY BOX */}
            <div className="p-3 flex flex-col bg-black/20 h-full">
              <h3 className="text-xl font-bold font-mono text-white/80 mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Registro Mensual
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
                {loadingGlobal ? (
                   <div className="animate-pulse space-y-3">
                     {[...Array(5)].map((_, i) => (
                       <div key={i} className="h-16 bg-white/5 rounded-lg" />
                     ))}
                   </div>
                ) : monthlyStats.length === 0 ? (
                  <div className="text-center text-gray-500 font-mono py-10">
                    Sin datos aún.
                  </div>
                ) : (
                  monthlyStats.map((stat, i) => (
                    <div 
                      key={i} 
                      className="bg-black/40 border border-white/10 rounded-lg p-3 flex justify-between items-center hover:bg-white/5 transition"
                    >
                      <div>
                        <p className="text-white font-mono font-bold capitalize">
                          {monthNames[stat.month - 1]} <span className="text-gray-500 text-sm">{stat.year}</span>
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-1">
                          {stat.operations} Opes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold ${stat.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {stat.pnl >= 0 ? "+" : ""}{stat.pnl.toFixed(2)}$ USDT
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM STATS CARDS */}
          <div className="border-t border-white/20 p-6 bg-black/40">
            <h3 className="text-sm font-mono text-gray-400 mb-4 tracking-widest uppercase">Estadísticas Globales del Bot</h3>
            
            {loadingGlobal || !botStats ? (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
                {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center">
                
                {/* PNL Total */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 relative overflow-hidden group">
                  <div className={`absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20 ${botStats.totalPnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                  <p className="text-gray-400 font-mono text-sm">PNL Total</p>
                  <p className={`text-2xl font-bold font-mono mt-2 ${botStats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {botStats.totalPnl >= 0 ? '+' : ''}{botStats.totalPnl.toFixed(2)}
                  </p>
                </div>

                {/* PNL / Operación */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 relative overflow-hidden group">
                  <div className={`absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20 ${avgPnlPerOperation >= 0 ? 'bg-cyan-500' : 'bg-red-500'}`} />
                  <p className="text-gray-400 font-mono text-sm">PNL / Operación</p>
                  <p className={`text-2xl font-bold font-mono mt-2 ${avgPnlPerOperation >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                    {avgPnlPerOperation >= 0 ? '+' : ''}{avgPnlPerOperation.toFixed(2)}
                  </p>
                </div>

                {/* Meses registrados */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20 bg-blue-500" />
                  <p className="text-gray-400 font-mono text-sm">Meses Registrados</p>
                  <p className="text-2xl font-bold font-mono mt-2 text-blue-400">
                    {monthlyStats.length}
                  </p>
                </div>

                {/* Win Rate */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 relative overflow-hidden group">
                  <div className={`absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20 ${botStats.winRate >= 50 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  <p className="text-gray-400 font-mono text-sm">Win Rate</p>
                  <p className={`text-2xl font-bold font-mono mt-2 ${botStats.winRate >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {botStats.winRate.toFixed(1)}%
                  </p>
                </div>

                {/* Total Ops */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-10 bg-purple-500 transition-opacity group-hover:opacity-20" />
                  <p className="text-gray-400 font-mono text-sm">Total Operaciones</p>
                  <p className="text-2xl font-bold font-mono mt-2 text-purple-400">
                    {botStats.totalOperations}
                  </p>
                </div>

              </div>
            )}
          </div>

          {/* EQUITY CURVE BOTTOM SECTION */}
          <div className="border-t border-white/20 p-6 bg-black/60 relative overflow-hidden">
            <h3 className="text-xl font-bold font-mono text-white/80 mb-6 flex items-center gap-2">
              <span className="text-purple-500 font-black">{"~"}</span> Curva de Rendimiento
            </h3>
            
            <div className="h-[280px] w-full mt-4">
              {loadingGlobal ? (
                <div className="w-full h-full animate-pulse bg-white/5 rounded-lg" />
              ) : chartData.length < 2 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-500 font-mono border border-white/10 rounded-lg">
                  Faltan datos para graficar
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.6} />
                        <stop offset={`${gradientOffset * 100}%`} stopColor="#22c55e" stopOpacity={0} />
                        <stop offset={`${gradientOffset * 100}%`} stopColor="#ef4444" stopOpacity={0} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#666" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      fontFamily="monospace"
                      dy={10}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      stroke="#666" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `${val >= 0 ? '+' : ''}$${val.toFixed(2)}`}
                      fontFamily="monospace"
                      width={60}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: '#ffffff20', strokeWidth: 2, strokeDasharray: "4 4" }}
                    />
                    
                    <ReferenceLine 
                      y={0} 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      strokeDasharray="4 4" 
                      opacity={0.8} 
                    />
                    
                    {/* 🔥 ACÁ ESTÁ LA CLAVE: El color frena en el 1$ */}
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#a855f7"
                      strokeWidth={3}
                      fill="url(#splitColor)"
                      baseValue={0}
                      dot={{ fill: '#000', stroke: '#a855f7', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#fff', stroke: '#a855f7', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
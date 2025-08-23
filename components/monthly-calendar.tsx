"use client"

import { useState, useEffect } from "react"
import { getDailyPnl } from "@/lib/bot-api"

export function MonthlyCalendar() {
  const [currentMonth, setCurrentMonth] = useState(8) // agosto
  const [currentYear, setCurrentYear] = useState(2025)
  const [dailyPnl, setDailyPnl] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDailyPnl = async () => {
      setLoading(true)
      try {
        const realDailyPnl = await getDailyPnl(currentYear, currentMonth)
        setDailyPnl(realDailyPnl)
      } catch (error) {
        console.error("[v0] Error loading daily PNL:", error)
        // Fallback to empty data if database fails
        setDailyPnl({})
      } finally {
        setLoading(false)
      }
    }

    loadDailyPnl()
  }, [currentMonth, currentYear])

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay()

  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ]

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  const renderCalendarDays = () => {
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const pnlValue = dailyPnl[day]
      const hasData = pnlValue !== undefined
      const isProfit = hasData && pnlValue > 0

      days.push(
        <div
          key={day}
          className={`aspect-square border border-green-500/20 rounded-lg flex flex-col items-center justify-center p-2 transition-all duration-300 hover:border-cyan-400/50 ${
            hasData
              ? isProfit
                ? "bg-green-500/10 border-green-500/50"
                : "bg-red-500/10 border-red-500/50"
              : "bg-white/10 border border-white/20"
          }`}
        >
          <span className="text-green-400 font-mono text-lg font-bold">{day}</span>
          {hasData && (
            <span className={`text-xs font-mono mt-1 ${isProfit ? "text-green-400" : "text-red-400"}`}>
              {isProfit ? "+" : ""}
              {pnlValue.toFixed(2)} USDT
            </span>
          )}
          {!hasData && <span className="text-gray-400 font-mono text-xs mt-1">0.00 USDT</span>}
        </div>,
      )
    }

    return days
  }

  return (
    <section id="history" className="py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg backdrop-blur-sm overflow-hidden">
          <div className="border-b border-white/20 p-6">
            <h2 className="text-3xl font-bold font-mono text-center">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {">"} Calendario Mensual
              </span>
            </h2>

            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => {
                  if (currentMonth > 1) {
                    setCurrentMonth(currentMonth - 1)
                  } else {
                    setCurrentMonth(12)
                    setCurrentYear(currentYear - 1)
                  }
                }}
                className="text-white hover:text-gray-300 font-mono text-2xl transition-colors"
              >
                {"<"}
              </button>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-white font-mono">{currentYear}</span>
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number.parseInt(e.target.value))}
                  className="bg-black/50 border border-white/30 rounded px-3 py-2 text-white font-mono focus:border-white/60 focus:outline-none"
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index + 1} className="bg-black">
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  if (currentMonth < 12) {
                    setCurrentMonth(currentMonth + 1)
                  } else {
                    setCurrentMonth(1)
                    setCurrentYear(currentYear + 1)
                  }
                }}
                className="text-white hover:text-gray-300 font-mono text-2xl transition-colors"
              >
                {">"}
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="animate-pulse">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayNames.map((day) => (
                    <div key={day} className="h-8 bg-white/10 rounded"></div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(35)].map((_, i) => (
                    <div key={i} className="aspect-square bg-white/5 rounded"></div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-gray-300 font-mono text-sm font-bold py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">{renderCalendarDays()}</div>
              </>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500/20 border border-green-500/50 rounded"></div>
                <span className="text-green-400 font-mono text-sm">Ganancia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/20 border border-red-500/50 rounded"></div>
                <span className="text-red-400 font-mono text-sm">Pérdida</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white/10 border border-white/20 rounded"></div>
                <span className="text-gray-400 font-mono text-sm">Sin operaciones</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

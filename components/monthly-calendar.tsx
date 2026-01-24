"use client"

import { useState, useEffect } from "react"
import { getDailyPnl, type BotId } from "@/lib/bot-api"
import { Button } from "@/components/ui/button"

const BOTS: { id: BotId; label: string }[] = [
  { id: "sniper", label: "SNIPER" },
  { id: "machinegun", label: "MACHINE GUN" },
  { id: "tanque", label: "TANQUE" },
]

export function MonthlyCalendar() {
  const now = new Date()

  const [selectedBot, setSelectedBot] = useState<BotId>("sniper")
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [dailyPnl, setDailyPnl] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDailyPnl = async () => {
      setLoading(true)
      try {
        const data = await getDailyPnl(
          selectedBot,
          currentYear,
          currentMonth,
        )
        setDailyPnl(data)
      } catch (error) {
        console.error("Error loading daily PNL:", error)
        setDailyPnl({})
      } finally {
        setLoading(false)
      }
    }

    loadDailyPnl()
  }, [selectedBot, currentMonth, currentYear])

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayOfMonth = new Date(
    currentYear,
    currentMonth - 1,
    1,
  ).getDay()

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
            {hasData ? `${pnl > 0 ? "+" : ""}${pnl.toFixed(2)} USDT` : "0.00 USDT"}
          </span>
        </div>,
      )
    }

    return days
  }

  return (
    <section id="history" className="py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg overflow-hidden">
          {/* HEADER */}
          <div className="border-b border-white/20 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-3xl font-bold font-mono">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {">"} Calendario Mensual
                </span>
              </h2>

              {/* BOT SELECTOR */}
              <div className="flex gap-2">
                {BOTS.map(bot => (
                  <Button
                    key={bot.id}
                    size="sm"
                    onClick={() => setSelectedBot(bot.id)}
                    className={`font-mono border ${
                      selectedBot === bot.id
                        ? "bg-white/20 border-white text-white"
                        : "bg-black/40 border-white/20 text-gray-400 hover:text-white"
                    }`}
                  >
                    {bot.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* MONTH NAV */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <button
                onClick={() => {
                  if (currentMonth > 1) setCurrentMonth(currentMonth - 1)
                  else {
                    setCurrentMonth(12)
                    setCurrentYear(currentYear - 1)
                  }
                }}
                className="text-white font-mono text-2xl"
              >
                {"<"}
              </button>

              <div className="flex items-center gap-4">
                <span className="text-white font-mono text-xl font-bold">
                  {currentYear}
                </span>
                <select
                  value={currentMonth}
                  onChange={e => setCurrentMonth(Number(e.target.value))}
                  className="bg-black/50 border border-white/30 rounded px-3 py-2 text-white font-mono"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1} className="bg-black">
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
                className="text-white font-mono text-2xl"
              >
                {">"}
              </button>
            </div>
          </div>

          {/* CALENDAR */}
          <div className="p-6">
            {loading ? (
              <div className="animate-pulse grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="aspect-square bg-white/5 rounded" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayNames.map(d => (
                    <div
                      key={d}
                      className="text-center text-gray-300 font-mono text-sm font-bold"
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
        </div>
      </div>
    </section>
  )
}

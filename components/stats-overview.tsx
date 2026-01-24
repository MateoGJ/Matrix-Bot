"use client"

import { useEffect, useMemo, useState } from "react"
import { getBotStats, type Stats, type BotId } from "@/lib/bot-api"

const BOTS = [
  { id: "sniper", name: "SNIPER", img: "/bots/SNPR.jpg" },
  { id: "machinegun", name: "MACHINE GUN", img: "/bots/MG.png" },
  { id: "tanque", name: "TANQUE", img: "/bots/TNQ.webp" },
] as const

export function StatsOverview() {
  const [data, setData] = useState<Record<BotId, Stats | null>>({
    sniper: null,
    machinegun: null,
    tanque: null,
  })

  useEffect(() => {
    async function load() {
      for (const bot of BOTS) {
        const stats = await getBotStats(bot.id)
        setData(prev => ({ ...prev, [bot.id]: stats }))
      }
    }

    load()
    const i = setInterval(load, 30000)
    return () => clearInterval(i)
  }, [])

  // =========================
  // TOTAL PNL (SUMA DE LOS 3)
  // =========================
  const totalPnl = useMemo(() => {
    return Object.values(data).reduce((acc, s) => {
      if (!s) return acc
      return acc + s.totalPnl
    }, 0)
  }, [data])

  const totalPnlPositive = totalPnl >= 0

  return (
    <section className="space-y-6 px-4 py-21 md:px-6 lg:px-8">

      {/* =========================
          GLOBAL PNL CARD
      ========================= */}
      <div className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-xl p-6 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest">
          PNL TOTAL SISTEMA
        </p>
        <p
          className={`mt-2 font-mono text-3xl ${
            totalPnlPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {totalPnl.toFixed(2)} USDT
        </p>
      </div>

      {/* =========================
          PER BOT STATS
      ========================= */}

      {BOTS.map(bot => {
        const s = data[bot.id]
        if (!s) return null

        return (
          <div
            key={bot.id}
            className="grid grid-cols-[8rem_repeat(5,1fr)] gap-12 items-center"
          >
            {/* BOT CARD (CHICA, CENTRADA) */}
            <div className="col-span-1 flex justify-center">
              <div className="w-21 h-21 bg-black/40 border border-white/20 rounded-lg p-1 flex flex-col items-center justify-center">
                <img
                  src={bot.img}
                  alt={bot.name}
                  className="w-full h-full object-contain"
                />
              
                <span className="mt-1 text-[12px] text-gray-400 font-mono text-center leading-none">
                  {bot.name}
                </span>
              </div>
            </div>

            {/* STATS */}
            {[
              ["Balance", s.balance.toFixed(2), "USDT", s.balance >= 0],
              ["PNL", s.totalPnl.toFixed(2), "USDT", s.totalPnl >= 0],
              ["OPS", s.totalOperations, "", true],
              ["W", s.wins, "", true],
              ["L", s.losses, "", false],
            ].map(([label, value, unit, pos], i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg p-4 text-center"
              >
                <p className="text-xs text-gray-400 uppercase">{label}</p>
                <p
                  className={`font-mono text-lg ${
                    pos ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {value} {unit}
                </p>
              </div>
            ))}
          </div>
        )
      })}
    </section>
  )
}

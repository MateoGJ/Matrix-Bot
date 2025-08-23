"use client"

import { useState, useEffect } from "react"
import { getBotStats, type Stats } from "@/lib/bot-api"

export function StatsOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const realStats = await getBotStats()
        setStats(realStats)
      } catch (error) {
        console.error("[v0] Error loading stats:", error)
        // Fallback to mock data if database fails
        setStats({
          balance: 1247.83,
          totalPnl: -0.87,
          totalOperations: 85,
          wins: 42,
          losses: 43,
          winRate: 49.4,
        })
      } finally {
        setLoading(false)
      }
    }

    loadStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <section className="py-8 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg backdrop-blur-sm p-4 animate-pulse"
              >
                <div className="h-16"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!stats) return null

  const statsData = [
    {
      label: "Balance",
      value: stats.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      unit: "USDT",
      change: "", // This could be calculated from historical data
      positive: true,
    },
    {
      label: "PNL",
      value: stats.totalPnl.toFixed(2),
      unit: "USDT",
      change: "", // This could be calculated from historical data
      positive: stats.totalPnl >= 0,
    },
    {
      label: "OPs",
      value: stats.totalOperations.toString(),
      unit: "",
      change: "",
      positive: true,
    },
    {
      label: "W",
      value: stats.wins.toString(),
      unit: "",
      change: `${((stats.wins / stats.totalOperations) * 100).toFixed(1)}%`,
      positive: true,
    },
    {
      label: "L",
      value: stats.losses.toString(),
      unit: "",
      change: `${((stats.losses / stats.totalOperations) * 100).toFixed(1)}%`,
      positive: false,
    },
  ]

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg backdrop-blur-sm p-4 hover:border-white/40 transition-all duration-300"
            >
              <div className="text-center">
                <p className="text-gray-300 font-mono text-sm uppercase tracking-wider mb-2">{stat.label}</p>
                <div className="flex items-center justify-center gap-1">
                  <span
                    className={`font-bold font-mono text-xl ${
                      stat.label === "Balance" || stat.label === "PNL"
                        ? stat.positive
                          ? "text-green-400"
                          : "text-red-400"
                        : "text-white"
                    }`}
                  >
                    {stat.value}
                  </span>
                  {stat.unit && <span className="text-gray-400 font-mono text-sm">{stat.unit}</span>}
                </div>
                <p className={`text-xs font-mono mt-1 ${stat.positive ? "text-green-400" : "text-red-400"}`}>
                  {stat.change}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

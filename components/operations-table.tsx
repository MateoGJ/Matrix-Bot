"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  getRecentOperations,
  type Operation,
  type BotId,
} from "@/lib/bot-api"

const BOTS: { id: BotId; label: string }[] = [
  { id: "sniper", label: "SNIPER" },
  { id: "machinegun", label: "MACHINE GUN" },
  { id: "tanque", label: "TANQUE" },
]

export function OperationsTable() {
  const [selectedBot, setSelectedBot] = useState<BotId>("sniper")
  const [filter, setFilter] = useState("")
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadOperations = async () => {
      setLoading(true)
      try {
        const ops = await getRecentOperations(selectedBot, 500)
        if (mounted) setOperations(ops)
      } catch (error) {
        console.error("Error loading operations:", error)
        if (mounted) setOperations([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadOperations()
    const interval = setInterval(loadOperations, 10000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [selectedBot])

  const filteredOperations = operations.filter(
    op => filter === "" || op.fecha.includes(filter),
  )

  const totalPnl = operations.reduce((sum, op) => sum + op.pnl, 0)

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="bg-black/40 border border-white/20 rounded-lg p-8 animate-pulse">
            <div className="h-8 bg-white/10 rounded mb-4" />
            <div className="h-64 bg-white/5 rounded" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="operations" className="py-16 px-4">
      <div className="container mx-auto">
        <div className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg overflow-hidden">
          {/* HEADER */}
          <div className="border-b border-white/20 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <h2 className="text-3xl font-bold font-mono">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {">"} Operaciones
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

            {/* STATS ROW */}
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <span className="text-gray-300 font-mono">
                PNL Total:
                <span
                  className={`ml-2 font-bold ${
                    totalPnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {totalPnl.toFixed(2)} USDT
                </span>
              </span>

              <span className="text-gray-300 font-mono">
                Operaciones:
                <span className="ml-2 text-white font-bold">
                  {operations.length}
                </span>
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="dd/mm/aaaa"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="bg-black/50 border border-white/30 rounded px-3 py-2 text-white font-mono"
                />
                <Button
                  size="sm"
                  onClick={() => setFilter("")}
                  className="bg-white/10 border border-white/30 font-mono"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-black/70">
                <tr className="border-b border-white/10">
                  {[
                    "ID",
                    "Mercado",
                    "Margen",
                    "APLX",
                    "Tipo",
                    "Resultado",
                    "PNL",
                    "Fecha",
                    "Duración",
                  ].map(h => (
                    <th
                      key={h}
                      className="p-4 text-left text-gray-300 font-mono text-xs uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredOperations.map(op => (
                  <tr
                    key={op.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="p-4 font-mono">{op.id}</td>
                    <td className="p-4 font-mono">{op.simbolo}</td>
                    <td className="p-4 font-mono">
                      {op.margen.toFixed(2)} USDT
                    </td>
                    <td className="p-4 font-mono">{op.apalancamiento}x</td>
                    <td className="p-4 font-mono">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          op.tipo_operacion === "BUY"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {op.tipo_operacion}
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      <span
                        className={
                          op.resultado >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {op.resultado.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      <span
                        className={
                          op.pnl >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {op.pnl.toFixed(2)} USDT
                      </span>
                    </td>
                    <td className="p-4 font-mono text-sm">
                      {new Date(op.fecha).toLocaleString("es-ES")}
                    </td>
                    <td className="p-4 font-mono text-sm">
                      {formatDuration(op.duracion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOperations.length === 0 && (
            <div className="text-center py-8 text-gray-400 font-mono">
              No hay operaciones para este bot
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

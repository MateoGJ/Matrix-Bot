"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { getRecentOperations, type Operation } from "@/lib/bot-api"

export function OperationsTable() {
  const [filter, setFilter] = useState("")
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOperations = async () => {
      try {
        const realOperations = await getRecentOperations(50)
        setOperations(realOperations)
      } catch (error) {
        console.error("[v0] Error loading operations:", error)
        // Keep empty array if database fails
        setOperations([])
      } finally {
        setLoading(false)
      }
    }

    loadOperations()

    // Refresh operations every 10 seconds
    const interval = setInterval(loadOperations, 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredOperations = operations.filter((op) => filter === "" || op.fecha.includes(filter))

  const totalPnl = operations.reduce((sum, op) => sum + op.pnl, 0)

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <section id="operations" className="py-16 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg backdrop-blur-sm p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-white/10 rounded mb-4"></div>
              <div className="h-64 bg-white/5 rounded"></div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="operations" className="py-16 px-4">
      <div className="container mx-auto">
        <div className="bg-gradient-to-br from-white/10 to-gray-100/5 border border-white/20 rounded-lg backdrop-blur-sm overflow-hidden">
          <div className="border-b border-white/20 p-6">
            <h2 className="text-3xl font-bold font-mono mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {">"} Operaciones del Bot
              </span>
            </h2>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-gray-300 font-mono">Total PNL:</span>
                <span className={`font-bold font-mono text-xl ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totalPnl.toFixed(2)} USDT
                </span>
                <span className="text-gray-300 font-mono ml-6">Total de Operaciones:</span>
                <span className="text-white font-bold font-mono text-xl">{operations.length}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-gray-300 font-mono">Filtrar por fecha:</span>
                <input
                  type="text"
                  placeholder="dd/mm/aaaa"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-black/50 border border-white/30 rounded px-3 py-2 text-white font-mono focus:border-white/60 focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => setFilter("")}
                  className="bg-gradient-to-r from-white/20 to-gray-300/20 hover:from-white/30 hover:to-gray-300/30 text-white font-bold border border-white/30"
                >
                  Limpiar Filtro
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">ID</th>
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">Mercado</th>
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">Margen</th>
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">APLX</th>
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">Tipo</th>
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">Resultado</th>
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">PNL</th>
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">Fecha</th>
                  <th className="text-left p-4 text-gray-300 font-mono text-sm uppercase tracking-wider">Duración</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperations.map((op) => (
                  <tr key={op.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-mono">{op.id}</td>
                    <td className="p-4 text-gray-200 font-mono">{op.simbolo}</td>
                    <td className="p-4 text-gray-200 font-mono">{op.margen.toFixed(2)} USDT</td>
                    <td className="p-4 text-white font-mono">{op.apalancamiento}x</td>
                    <td className="p-4 font-mono">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          op.tipo_operacion === "BUY"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {op.tipo_operacion}
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      <span className={op.resultado < 0 ? "text-red-400" : "text-green-400"}>
                        {op.resultado.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      <span className={op.pnl < 0 ? "text-red-400" : "text-green-400"}>{op.pnl.toFixed(2)} USDT</span>
                    </td>
                    <td className="p-4 text-gray-200 font-mono text-sm">
                      {new Date(op.fecha).toLocaleString("es-ES")}
                    </td>
                    <td className="p-4 text-white font-mono text-sm">{formatDuration(op.duracion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredOperations.length === 0 && (
              <div className="text-center py-8 text-gray-400 font-mono">
                {operations.length === 0
                  ? "No hay operaciones registradas"
                  : "No se encontraron operaciones con ese filtro"}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

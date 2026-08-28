"use client"

import { useState, useEffect } from "react"
import { getRecentOperations } from "@/lib/bot-api"

interface OperationsTableProps {
  botId?: string
}

export function OperationsTable({ botId }: OperationsTableProps) {
  const [filter, setFilter] = useState("")
  const [operations, setOperations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadOperations = async () => {
      if (!botId) return
      try {
        const ops = await getRecentOperations(botId, 500)
        if (mounted) setOperations(ops || [])
      } catch (error) {
        console.error("Error cargando operaciones:", error)
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
  }, [botId])

  const filteredOperations = operations.filter(
    (op) =>
      op.simbolo?.toLowerCase().includes(filter.toLowerCase()) ||
      op.tipo_operacion?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4 font-mono">
      <div className="glass-surface overflow-hidden rounded-lg p-3 sm:p-4">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            HISTORIAL DE OPERACIONES - {botId?.toUpperCase()}
          </h3>
          <input
            type="text"
            placeholder="Filtrar por símbolo o tipo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-w-48 rounded border border-border bg-background/45 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* 👈 ACÁ ESTÁN LAS 7 COLUMNAS QUE PEDISTE EXACTAS */}
              <tr className="border-b-2 border-white/10 text-pink-400 uppercase tracking-wider">
                <th className="p-3">Símbolo</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Apalancamiento</th>
                <th className="p-3">Margen</th>
                <th className="p-3">Resultado</th>
                <th className="p-3">PnL</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500 font-bold uppercase tracking-widest">
                    Cargando operaciones de la base de datos...
                  </td>
                </tr>
              ) : filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500 font-bold uppercase tracking-widest border border-dashed border-white/5 rounded">
                    No hay operaciones registradas para este bot.
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op, idx) => (
                  <tr
                    key={op.id || idx}
                    className="border-b-2 border-white/14 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3 font-bold text-white">{op.simbolo}</td>
                    <td className="p-3">
                      <span
                        className={`font-bold ${
                          op.tipo_operacion === "BUY" || op.tipo_operacion === "LONG"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {op.tipo_operacion}
                      </span>
                    </td>
                    <td className="p-3 text-lime-400 font-bold">{op.apalancamiento}x</td>
                    <td className="p-3 text-teal-300 font-bold">${Number(op.margen).toFixed(2)}</td>
                    <td className="p-3 font-bold">
                      <span className={Number(op.resultado) >= 0 ? "text-green-400" : "text-red-400"}>
                        {Number(op.resultado) >= 0 ? "+" : ""}
                        {Number(op.resultado).toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-3 font-bold">
                      <span className={Number(op.pnl) >= 0 ? "text-green-400" : "text-red-400"}>
                        {Number(op.pnl) >= 0 ? "+" : ""}
                        {Number(op.pnl).toFixed(2)} USDT
                      </span>
                    </td>
                    <td className="p-3 text-amber-500">
                      {op.fecha ? new Date(op.fecha).toLocaleString("es-AR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' }) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

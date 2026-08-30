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
        if (mounted) setOperations([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadOperations()
    const interval = setInterval(loadOperations, 10000)
    return () => { mounted = false; clearInterval(interval) }
  }, [botId])

  const filteredOperations = operations.filter(
    (op) =>
      op.simbolo?.toLowerCase().includes(filter.toLowerCase()) ||
      op.tipo_operacion?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-4 font-mono">
      <div className="bg-black/60 border border-white/10 rounded-lg p-5">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            HISTORIAL DE OPERACIONES - {botId?.toUpperCase()}
          </h3>
          <input
            type="text"
            placeholder="Filtrar por símbolo o tipo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-black/50 border border-white/20 rounded px-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-white/10 text-pink-400 uppercase tracking-wider">
                <th className="p-3 text-center">Símbolo</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3 text-center">AplX</th>
                <th className="p-3 text-center">Margen</th>
                <th className="p-3 text-center">Resultado</th>
                <th className="p-3 text-center">PnL</th>
                <th className="p-3 text-center">Fecha</th>
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
                  <tr key={op.id || idx} className="border-b-2 border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white text-center">{op.simbolo}</td>
                    <td className="p-3 text-center">
                      <span className={`font-bold ${op.tipo_operacion === "BUY" || op.tipo_operacion === "LONG" ? "text-green-400" : "text-red-400"}`}>
                        {op.tipo_operacion}
                      </span>
                    </td>
                    <td className="p-3 text-lime-400 font-bold text-center">{op.apalancamiento}x</td>
                    <td className="p-3 text-teal-300 font-bold text-center">${Number(op.margen).toFixed(2)}</td>
                    <td className="p-3 font-bold text-center">
                      <span className={Number(op.resultado) >= 0 ? "text-green-400" : "text-red-400"}>
                        {Number(op.resultado) >= 0 ? "+" : ""}{Number(op.resultado).toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-3 font-bold text-center">
                      <span className={Number(op.pnl) >= 0 ? "text-green-400" : "text-red-400"}>
                        {Number(op.pnl) >= 0 ? "+" : ""}{Number(op.pnl).toFixed(2)} USDT
                      </span>
                    </td>
                    <td className="p-3 text-amber-500 text-center">
                      {op.fecha ? new Date(op.fecha).toLocaleString("es-AR", { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute:'2-digit' }) : "-"}
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
"use client"

import { useState, useEffect } from "react"
import { getRecentOperations, getBotVersionHistory } from "@/lib/bot-api"

interface OperationsTableProps {
  botId?: string
}

export function OperationsTable({ botId }: OperationsTableProps) {
  const [filter, setFilter] = useState("")
  const [operations, setOperations] = useState<any[]>([])
  
  // 🧬 Nuevos estados para manejar las versiones
  const [versions, setVersions] = useState<string[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)

  // 1. Cargar las versiones disponibles para este bot
  useEffect(() => {
    let mounted = true
    const loadVersions = async () => {
      if (!botId) return
      try {
        const hist = await getBotVersionHistory(botId)
        if (mounted && hist && hist.length > 0) {
          const vList = hist.map((v: any) => v.version)
          setVersions(vList)
          setSelectedVersion(vList[0]) // Selecciona la última versión por defecto
        }
      } catch (error) {
        console.error("Error cargando versiones:", error)
      }
    }
    loadVersions()
    return () => { mounted = false }
  }, [botId])

  // 2. Cargar operaciones y filtrar por la versión seleccionada
  useEffect(() => {
    let mounted = true
    const loadOperations = async () => {
      if (!botId || !selectedVersion) return
      try {
        // Consultamos las operaciones. Si tu backend acepta 3 parámetros (botId, version, limit),
        // lo intentamos. Sino, hacemos un fallback pidiendo todas y filtrando en el frontend.
        // @ts-ignore
        const ops = await getRecentOperations(botId, selectedVersion, 500).catch(() => getRecentOperations(botId, 500))
        
        if (mounted) {
          const safeOps = ops || []
          // Filtro estricto en frontend para asegurar que solo veas las de la versión elegida
          const versionOps = safeOps.filter((op: any) => op.version === selectedVersion)
          
          // Si las operaciones viejas en BD no tienen versión, te mostramos lo que haya
          // para no dejarte la tabla vacía por error.
          setOperations(versionOps.length > 0 ? versionOps : safeOps)
        }
      } catch (error) {
        if (mounted) setOperations([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (selectedVersion) {
      loadOperations()
      const interval = setInterval(loadOperations, 10000)
      return () => { mounted = false; clearInterval(interval) }
    }
  }, [botId, selectedVersion])

  // Filtramos por búsqueda de texto (solo tipo ya que no hay símbolo)
  const filteredOperations = operations.filter(
    (op) => op.tipo_operacion?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-4 font-mono w-full select-none">
      <div className="bg-black border border-white/5 rounded p-4">
        
        {/* HEADER CONTROLS & VERSIONES */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 border-b border-white/10 pb-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <span>📋</span> HISTORIAL DE OPERACIONES
            </h3>
            
            {/* APARTADITO DE VERSIONES */}
            {versions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {versions.map((v, idx) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVersion(v)}
                    className={`text-[10px] px-3 py-1.5 rounded font-bold uppercase tracking-widest transition-all border ${
                      selectedVersion === v 
                        ? "bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]" 
                        : "bg-zinc-900/50 text-zinc-500 border-white/5 hover:text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {v} {idx === 0 && "(Activa)"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="> Buscar B/S..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full xl:w-64 bg-zinc-900/80 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {/* TABLA SCROLLABLE CON CABECERA STICKY */}
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar rounded border border-white/5 bg-black">
          <table className="w-full text-center text-xs border-collapse relative">
            <thead className="sticky top-0 bg-black/95 backdrop-blur-md z-10 shadow-md">
              <tr className="border-b border-white/10 text-zinc-500 uppercase tracking-widest text-[10px]">
                <th className="p-3 font-bold">Tipo</th>
                <th className="p-3 font-bold">AplX</th>
                <th className="p-3 font-bold">Margen</th>
                <th className="p-3 font-bold">ROI</th>
                <th className="p-3 font-bold">PnL</th>
                <th className="p-3 font-bold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-zinc-600 font-bold uppercase tracking-widest">
                    <span className="animate-pulse">Cargando registros...</span>
                  </td>
                </tr>
              ) : filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-zinc-600 font-bold uppercase tracking-widest">
                    Sin registros para esta versión
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op, idx) => (
                  <tr key={op.id || idx} className="border-b border-white/5 hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3 text-center">
                      <span className={`font-bold ${op.tipo_operacion === "BUY" || op.tipo_operacion === "LONG" ? "text-green-400" : "text-red-400"}`}>
                        {op.tipo_operacion}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300 font-bold text-center bg-white/[0.02]">{op.apalancamiento}x</td>
                    <td className="p-3 text-white font-bold text-center">${Number(op.margen).toFixed(2)}</td>
                    <td className="p-3 font-bold text-center bg-white/[0.02]">
                      <span className={Number(op.resultado) >= 0 ? "text-cyan-400" : "text-red-400"}>
                        {Number(op.resultado) >= 0 ? "+" : ""}{Number(op.resultado).toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-3 font-bold text-center">
                      <span className={Number(op.pnl) >= 0 ? "text-green-400" : "text-red-400"}>
                        {Number(op.pnl) >= 0 ? "+" : ""}{Number(op.pnl).toFixed(2)}$
                      </span>
                    </td>
                    <td className="p-3 text-zinc-500 text-center text-[10px] bg-white/[0.02]">
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
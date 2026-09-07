"use client"

import { useState, useEffect } from "react"
import { getBotVersionHistory } from "@/lib/bot-api"

interface VersionHistory {
  version: string
  fecha: string
  operaciones: number
  winRate: number
  pnl: number
  config: Record<string, any>
}

export function BotVersionConfig({ botId, botName }: { botId: string, botName: string }) {
  const [versions, setVersions] = useState<VersionHistory[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getBotVersionHistory(botId).then(data => {
      if (!mounted) return
      setVersions(data)
      // La primera de la lista (ordenada por fecha DESC en MySQL) es siempre la ACTIVA
      setSelectedVersion(data[0]?.version)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [botId])

  const currentData = versions.find(v => v.version === selectedVersion) || versions[0]

  if (loading) {
    return <div className="text-gray-500 font-mono text-sm p-5 animate-pulse">Sincronizando versiones con la base de datos...</div>
  }

  if (versions.length === 0) {
    return <div className="text-gray-500 font-mono text-sm p-5 border border-dashed border-white/10 rounded-lg">No hay historial de versiones registrado para este bot.</div>
  }

  return (
    <div className="space-y-6 font-mono text-sm">
      <div className="bg-black/60 border border-white/10 rounded-lg p-5">
        <h3 className="text-white font-bold mb-4 flex items-center space-x-2">
          <span>📜</span>
          <span>HISTORIAL DE VERSIONES - {botName}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {versions.map((v, index) => {
            const isActive = index === 0 // La index 0 es la más reciente

            return (
              <button
                key={v.version}
                onClick={() => setSelectedVersion(v.version)}
                className={`relative p-3 rounded-lg border text-left transition-all ${
                  selectedVersion === v.version
                    ? "bg-green-500/10 border-green-400 text-white"
                    : "bg-black/50 border-white/10 text-gray-400 hover:border-white/30 hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-lg">
                    ACTIVA
                  </span>
                )}
                
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-green-400">{v.version}</span>
                  <span className="text-[10px] text-gray-500">{v.fecha}</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>WinRate:</span>
                    <span className="text-white">{v.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>PnL:</span>
                    <span className={v.pnl >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                      {v.pnl >= 0 ? "+" : ""}${v.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-black/60 border border-white/10 rounded-lg p-5">
        <h3 className="text-white font-bold mb-3 flex items-center space-x-2">
          <span>⚙️</span>
          <span>CONFIGURACIÓN DEL SISTEMA (CONFIG JSON)</span>
        </h3>
        <pre className="bg-black/80 p-4 rounded border border-white/10 text-green-400 text-xs overflow-x-auto custom-scrollbar">
          {JSON.stringify(currentData?.config || {}, null, 2)}
        </pre>
      </div>
    </div>
  )
}
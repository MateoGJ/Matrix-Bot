"use client"

import { useState } from "react"

interface VersionHistory {
  version: string
  fecha: string
  operaciones: number
  winRate: number
  pnl: number
  config: Record<string, any>
}

interface BotVersionConfigProps {
  botName: string
  versions: VersionHistory[]
}

export function BotVersionConfig({ botName, versions }: BotVersionConfigProps) {
  const [selectedVersion, setSelectedVersion] = useState(versions[0]?.version || "v2.0")
  const currentData = versions.find(v => v.version === selectedVersion) || versions[0]

  return (
    <div className="flex flex-col gap-5 font-mono text-sm">
      <div className="bg-black/60 border border-white/10 rounded-lg p-5">
        <h3 className="text-white font-bold mb-4 flex items-center space-x-2">
          <span className="text-primary">VERSIONS</span>
          <span>HISTORIAL DE VERSIONES - {botName}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {versions.map((v) => (
            <button
              key={v.version}
              onClick={() => setSelectedVersion(v.version)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedVersion === v.version
                  ? "bg-green-500/10 border-green-400 text-white"
                  : "bg-black/50 border-white/10 text-gray-400 hover:border-white/30"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-green-400">{v.version}</span>
                <span className="text-[10px] text-gray-500">{v.fecha}</span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>WinRate:</span>
                  <span className="text-white">{v.winRate}%</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>PnL:</span>
                  <span className={v.pnl >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                    {v.pnl >= 0 ? "+" : ""}${v.pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-black/60 border border-white/10 rounded-lg p-5">
        <h3 className="text-white font-bold mb-3 flex items-center space-x-2">
          <span className="text-primary">JSON</span>
          <span>CONFIGURACIÓN DEL SISTEMA (CONFIG JSON)</span>
        </h3>
        <pre className="bg-black/80 p-4 rounded border border-white/10 text-green-400 text-xs overflow-x-auto">
          {JSON.stringify(currentData?.config || {}, null, 2)}
        </pre>
      </div>
    </div>
  )
}

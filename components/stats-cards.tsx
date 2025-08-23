"use client"

import { useEffect, useState } from "react"
import BotConsole from "./bot-console"

export function StatsCards() {
  const [formData, setFormData] = useState({
    apiKey: "MoAcsgKcNJFW1oXGqnKHm9sgn4iIMXtiDkdohXyjhdwevXQMEl9zTVXrOKYEefIp",
    apiSecret: "bBnH4g7LsLyN93cm38pWAsmTw8XNmV2HPXTpoCN4MmUZ66LxczHKpCt0H1FCQchW",
    stopLoss: "111",
    accountPercent: "11",
  })

  const [botRunning, setBotRunning] = useState(false)
  const [loading, setLoading] = useState(false)

  // Lee el estado real del bot desde el backend (bot-runner.ts)
  const refreshStatus = async () => {
    try {
      const r = await fetch("/api/bot/status", { cache: "no-store" })
      if (!r.ok) return
      const data = await r.json()
      setBotRunning(Boolean(data?.running))
    } catch {}
  }

  useEffect(() => {
    refreshStatus()
    const id = setInterval(refreshStatus, 3000) // poll cada 3s
    return () => clearInterval(id)
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleBotToggle = async () => {
    setLoading(true)
    try {
      if (!botRunning) {
        // START real del proceso Python
        const res = await fetch("/api/bot/start", { method: "POST" })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.ok) {
          setBotRunning(true)
        } else {
          alert(`Error al iniciar: ${data?.error ?? res.status}`)
        }
      } else {
        // STOP real (SIGINT -> fallback SIGKILL)
        const res = await fetch("/api/bot/stop", { method: "POST" })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.ok) {
          setBotRunning(false)
        } else {
          alert(`Error al detener: ${data?.error ?? res.status}`)
        }
      }
    } catch (error) {
      console.error("[v0] Bot toggle error:", error)
      alert("Error al controlar el bot")
    } finally {
      setLoading(false)
      // refrescamos el estado por las dudas
      setTimeout(refreshStatus, 500)
    }
  }

  return (
    <section id="stats" className="py-16 px-4">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 font-mono">
          <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {">"} Panel de Control
          </span>
        </h2>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <div className="bg-gradient-to-br from-black/80 to-gray-900/20 border border-white/30 rounded-lg p-8 backdrop-blur-sm">
            <div className="border border-white/20 rounded-lg p-4 mb-6">
              <h3 className="text-white font-mono text-lg mb-4 text-center border-b border-white/20 pb-2">BOT</h3>

              <div className="grid grid-cols-3 gap-6">
                {/* Left Column - APIs */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-white font-mono text-sm mb-2">API Key</div>
                    <input
                      type="text"
                      value={formData.apiKey}
                      onChange={(e) => handleInputChange("apiKey", e.target.value)}
                      className="w-full bg-black/50 border border-white/30 rounded px-3 py-2 text-white font-mono text-sm focus:border-white/60 focus:outline-none"
                      placeholder="Enter API Key"
                      disabled={botRunning}
                    />
                  </div>

                  <div className="text-center">
                    <div className="text-white font-mono text-sm mb-2">API Secret</div>
                    <input
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => handleInputChange("apiSecret", e.target.value)}
                      className="w-full bg-black/50 border border-white/30 rounded px-3 py-2 text-white font-mono text-sm focus:border-white/60 focus:outline-none"
                      placeholder="Enter API Secret"
                      disabled={botRunning}
                    />
                  </div>
                </div>

                {/* Center Column - START/STOP */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <button
                    onClick={handleBotToggle}
                    disabled={loading || !formData.apiKey || !formData.apiSecret}
                    className={`px-8 py-4 rounded-lg font-mono text-lg font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      botRunning
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {loading ? "..." : botRunning ? "STOP" : "START"}
                  </button>

                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono text-sm">R</span>
                      <div
                        className={`w-4 h-4 rounded-full ${
                          !botRunning ? "bg-red-500 shadow-red-500/50 shadow-lg" : "bg-gray-600"
                        }`}
                      ></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono text-sm">V</span>
                      <div
                        className={`w-4 h-4 rounded-full ${
                          botRunning ? "bg-green-500 shadow-green-500/50 shadow-lg" : "bg-gray-600"
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Right Column - SL% and % de Cuenta */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-white font-mono text-sm mb-2">SL %</div>
                    <input
                      type="number"
                      value={formData.stopLoss}
                      onChange={(e) => handleInputChange("stopLoss", e.target.value)}
                      className="w-full bg-black/50 border border-white/30 rounded px-3 py-2 text-white font-mono text-xl text-center focus:border-white/60 focus:outline-none"
                      disabled={botRunning}
                    />
                  </div>

                  <div className="text-center">
                    <div className="text-white font-mono text-sm mb-2">% de Cuenta</div>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.accountPercent}
                      onChange={(e) => handleInputChange("accountPercent", e.target.value)}
                      className="w-full bg-black/50 border border-white/30 rounded px-3 py-2 text-white font-mono text-xl text-center focus:border-white/60 focus:outline-none"
                      disabled={botRunning}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex justify-between items-center text-sm font-mono">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    formData.apiKey && formData.apiSecret ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <span className="text-white">
                  API Status: {formData.apiKey && formData.apiSecret ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="text-white">Bot Status: {botRunning ? "Running" : "Stopped"}</div>
            </div>
          </div>

          <BotConsole botRunning={botRunning} />
        </div>
      </div>
    </section>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { getBotStats, type Stats, type BotId } from "@/lib/bot-api"

const BOTS = [{ id: "sniper", name: "SNIPER", img: "/bots/SNPR.jpg" }, { id: "machinegun", name: "MACHINE GUN", img: "/bots/MG.png" }, { id: "tanque", name: "TANQUE", img: "/bots/TNQ.webp" }, { id: "browning", name: "BROWNING", img: "/bots/BRWN.jfif" }] as const

export function StatsOverview() {
  const [data, setData] = useState<Record<BotId, Stats | null>>({ sniper: null, machinegun: null, tanque: null, browning: null })
  useEffect(() => { async function load() { for (const bot of BOTS) { const stats = await getBotStats(bot.id); setData((prev) => ({ ...prev, [bot.id]: stats })) } } load(); const i = setInterval(load, 30000); return () => clearInterval(i) }, [])
  const totalPnl = useMemo(() => Object.values(data).reduce((acc, s) => acc + (s?.totalPnl || 0), 0), [data])
  return <section className="flex flex-col gap-4 px-3 py-8 sm:px-6 lg:px-8">
    <div className="glass-surface rounded-lg p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Fleet performance</p><p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">PNL total</p><p className={`mt-1 font-mono text-3xl font-bold tracking-tight ${totalPnl >= 0 ? "text-chart-2" : "text-destructive"}`}>{totalPnl.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USDT</span></p></div><span className="rounded border border-border bg-secondary/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Live · 30s</span></div></div>
    {BOTS.map((bot) => { const s = data[bot.id]; if (!s) return null; const metrics = [["Balance", s.balance.toFixed(2), "USDT", s.balance >= 0], ["PNL", s.totalPnl.toFixed(2), "USDT", s.totalPnl >= 0], ["OPS", s.totalOperations, "", true], ["W", s.wins, "", true], ["L", s.losses, "", false]] as const; return <div key={bot.id} className="grid gap-2 rounded-lg border border-border/55 bg-card/40 p-3 sm:grid-cols-[8rem_repeat(5,minmax(0,1fr))] sm:items-stretch sm:gap-2"><div className="flex items-center gap-3 border-b border-border/40 pb-2 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3"><div className="flex size-11 items-center justify-center overflow-hidden rounded border border-border bg-background/50 p-1"><img src={bot.img} alt={bot.name} className="size-full object-contain" /></div><span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground">{bot.name}</span></div>{metrics.map(([label, value, unit, positive]) => <div key={label} className="flex min-w-0 items-center justify-between gap-2 rounded border border-border/40 bg-secondary/30 px-3 py-2 sm:block sm:px-2.5"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className={`font-mono text-sm font-bold tabular-nums sm:mt-1 ${positive ? "text-chart-2" : "text-destructive"}`}>{value} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span></p></div>)}</div> })}
  </section>
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { getBotStats, type Stats, type BotId } from "@/lib/bot-api"

const BOTS = [{ id: "sniper", name: "SNIPER", img: "/bots/SNPR.jpg" }, { id: "machinegun", name: "MACHINE GUN", img: "/bots/MG.png" }, { id: "tanque", name: "TANQUE", img: "/bots/TNQ.webp" }, { id: "browning", name: "BROWNING", img: "/bots/BRWN.jfif" }] as const

export function StatsOverview() {
  const [data, setData] = useState<Record<BotId, Stats | null>>({ sniper: null, machinegun: null, tanque: null, browning: null })
  useEffect(() => { async function load() { for (const bot of BOTS) { const stats = await getBotStats(bot.id); setData((prev) => ({ ...prev, [bot.id]: stats })) } } load(); const i = setInterval(load, 30000); return () => clearInterval(i) }, [])
  const totalPnl = useMemo(() => Object.values(data).reduce((acc, s) => acc + (s?.totalPnl || 0), 0), [data])
  return <section className="flex flex-col gap-5 px-4 py-10 md:px-6 lg:px-8">
    <div className="glass-surface rounded-xl p-6"><p className="eyebrow">Fleet performance</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">PNL total</p><p className={`mt-1 font-mono text-4xl font-bold tracking-tight ${totalPnl >= 0 ? "text-chart-2" : "text-destructive"}`}>{totalPnl.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USDT</span></p></div><span className="rounded-full border border-border bg-secondary/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Live · 30s</span></div></div>
    {BOTS.map((bot) => { const s = data[bot.id]; if (!s) return null; return <div key={bot.id} className="grid gap-2 rounded-xl border border-border/60 bg-card/55 p-3 sm:grid-cols-[7rem_repeat(5,1fr)] sm:items-center sm:gap-3"><div className="flex items-center gap-3 sm:flex-col sm:justify-center"><div className="flex size-14 items-center justify-center overflow-hidden rounded-lg border border-border bg-background/60 p-1"><img src={bot.img} alt={bot.name} className="size-full object-contain" /></div><span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground">{bot.name}</span></div>{[["Balance", s.balance.toFixed(2), "USDT", s.balance >= 0], ["PNL", s.totalPnl.toFixed(2), "USDT", s.totalPnl >= 0], ["OPS", s.totalOperations, "", true], ["W", s.wins, "", true], ["L", s.losses, "", false]].map(([label, value, unit, pos]) => <div key={String(label)} className="rounded-lg border border-border/50 bg-secondary/45 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-1 font-mono text-base font-bold ${pos ? "text-chart-2" : "text-destructive"}`}>{value} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span></p></div>)}</div> })}
  </section>
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-primary/45 bg-primary/10 font-mono text-sm font-bold text-primary">MR</div>
          <div>
            <p className="font-mono text-sm font-bold tracking-[0.18em] text-foreground">MYROBOTRADER</p>
            <p className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">Automated trading intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 sm:flex">
            <span className="status-dot size-1.5 rounded-full bg-chart-2" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sistema online</span>
          </div>
          <Button aria-label="Abrir menú" variant="outline" size="icon" className="border-border bg-transparent text-muted-foreground hover:text-foreground md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? "Cerrar" : "Menú"}</Button>
        </div>
      </div>
      {isMenuOpen && <div className="border-t border-border/50 px-4 py-3 text-xs text-muted-foreground md:hidden">Panel de monitoreo</div>}
    </header>
  )
}

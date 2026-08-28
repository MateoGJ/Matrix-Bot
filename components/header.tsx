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
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">
          {[["#operations", "Operaciones"], ["#stats", "Estadísticas"], ["#history", "Historial"], ["#contact", "Contacto"]].map(([href, label]) => (
            <a key={href} href={href} className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 sm:flex">
            <span className="status-dot size-1.5 rounded-full bg-chart-2" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sistema online</span>
          </div>
          <Button className="matrix-button hidden rounded-md bg-primary px-4 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 sm:inline-flex">Empezar a ganar</Button>
          <Button aria-label="Abrir menú" variant="outline" size="icon" className="border-border bg-transparent text-muted-foreground hover:text-foreground md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? "Cerrar" : "Menú"}</Button>
        </div>
      </div>
      {isMenuOpen && <nav className="flex flex-col gap-3 border-t border-border/50 px-4 py-4 md:hidden" aria-label="Menú móvil">{["Operaciones", "Estadísticas", "Historial", "Contacto"].map((label) => <a key={label} href={`#${label.toLowerCase()}`} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</a>)}</nav>}
    </header>
  )
}

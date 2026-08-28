"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  const [glitchText, setGlitchText] = useState("Generá plata con la mejor tecnología")

  useEffect(() => {
    const originalText = "Generá plata con la mejor tecnología"
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setGlitchText(originalText.split("").map((char) => Math.random() > 0.9 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char).join(""))
        setTimeout(() => setGlitchText(originalText), 100)
      }
    }, 111)
    return () => clearInterval(glitchInterval)
  }, [])

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-14 sm:pb-14 sm:pt-20">
      <div className="mx-auto max-w-5xl text-center">
        <p className="eyebrow mb-5 font-mono">01 / Autonomous crypto execution</p>
        <h1 className="text-balance font-mono text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
          <span className="glitch">{glitchText}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty font-mono text-sm leading-6 text-muted-foreground sm:text-base">{">"} Bot de trading automatizado para operar con disciplina, datos y control de riesgo.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="matrix-button w-full rounded-md bg-primary px-6 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 sm:w-auto">Iniciar trading bot</Button>
          <Button variant="outline" className="w-full rounded-md border-border bg-transparent px-6 font-mono text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary sm:w-auto">Ver demo</Button>
        </div>
      </div>
    </section>
  )
}

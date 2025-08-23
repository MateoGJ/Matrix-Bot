"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  const [glitchText, setGlitchText] = useState("Maximiza tus ganancias con la mejor tecnología")

  useEffect(() => {
    const originalText = "Maximiza tus ganancias con la mejor tecnología"
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        const glitched = originalText
          .split("")
          .map((char) => (Math.random() > 0.9 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char))
          .join("")
        setGlitchText(glitched)

        setTimeout(() => setGlitchText(originalText), 100)
      }
    }, 2000)

    return () => clearInterval(glitchInterval)
  }, [])

  return (
    <section className="relative py-20 px-4">
      <div className="container mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 font-mono">
            <span className="bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent animate-pulse">
              {glitchText}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 font-mono">
            {">"} Mejores rendimientos minimizando pérdidas
          </p>
          <p className="text-lg text-gray-400 mb-12 font-mono opacity-80">
            Bot de trading automatizado con IA avanzada
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-white to-gray-300 hover:from-gray-200 hover:to-gray-400 text-black font-bold px-8 py-4 text-lg rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-white/25"
          >
            🚀 Iniciar Trading Bot
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-gray-400 text-gray-300 hover:bg-gray-400 hover:text-black font-bold px-8 py-4 text-lg rounded-lg transition-all duration-300 transform hover:scale-105 bg-transparent"
          >
            📊 Ver Demo
          </Button>
        </div>
      </div>
    </section>
  )
}

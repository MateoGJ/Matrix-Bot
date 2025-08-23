"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="relative z-20 border-b border-green-900/30 bg-black/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 flex items-center justify-center">
              <span className="text-black font-bold text-lg">₿</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              MyRoboTrader
            </h1>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#operations" className="hover:text-cyan-400 transition-colors font-mono">
              Operaciones
            </a>
            <a href="#stats" className="hover:text-cyan-400 transition-colors font-mono">
              Estadísticas
            </a>
            <a href="#history" className="hover:text-cyan-400 transition-colors font-mono">
              Historial
            </a>
            <a href="#contact" className="hover:text-cyan-400 transition-colors font-mono">
              Contacto
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <Button className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105">
              Empezar a Ganar
            </Button>
            <Button
              variant="outline"
              className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-all duration-300 bg-transparent"
            >
              🌙
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

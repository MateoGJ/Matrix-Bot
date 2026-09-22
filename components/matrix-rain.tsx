"use client"

import { useEffect, useRef } from "react"

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const currencySymbols = "$€$₿¥$₿£$₿₿$₹$₽$₿₩$₿₪$₨$₿₿₦$₡$₿₴$₸₿$₿₵$₲₿$₿₱$₫₿$₭$₯$₰₿$₳$₴$₿₵$₶$₷₿$₸₿₿$₹$₿₺$₻₿$₼₿$₽$₾$₿"
    const symbolsArray = currencySymbols.split("")

    const fontSize = 24
    const columns = canvas.width / fontSize

    const drops: number[] = []
    for (let x = 0; x < columns; x++) {
      drops[x] = 1
    }

    function draw() {
      if (!ctx || !canvas) return

      // Fondo tenue para dejar rastro
      ctx.shadowBlur = 0
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = fontSize + "px monospace"

      for (let i = 0; i < drops.length; i++) {
        const text = symbolsArray[Math.floor(Math.random() * symbolsArray.length)]
        
        // 🧬 Distribución: 80% Blanco, 10% Verde Neón, 10% Rojo Neón
        const randColor = Math.random()
        if (randColor < 0.8) {
          ctx.shadowBlur = 0
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.3})`
        } else if (randColor < 0.9) {
          // Verde Neón con Glow
          ctx.fillStyle = `#00FF41`
          ctx.shadowColor = `#00FF41`
          ctx.shadowBlur = 15
        } else {
          // Rojo Neón con Glow
          ctx.fillStyle = `#FF003C`
          ctx.shadowColor = `#FF003C`
          ctx.shadowBlur = 15
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 35)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-25" />
}
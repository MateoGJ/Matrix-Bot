import type React from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
})

export const metadata = {
  title: "MyRoboTrader - Bot de Trading Crypto Matrix Style",
  description: "Bot de trading automatizado con IA avanzada para maximizar ganancias en criptomonedas",
    generator: 'v0.app',
  icons: {
      icon: "/images/dollar.jpg",
    },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="bg-black text-green-400">{children}</body>
    </html>
  )
}

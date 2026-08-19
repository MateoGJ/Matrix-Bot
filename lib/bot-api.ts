"use server"

import mysql from "mysql2/promise"
import crypto from "crypto"

// =========================
// DB CONFIG + POOL
// =========================
const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "maximiliano1o1o",
  database: "trading_db",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
})

// =========================
// BOTS
// =========================
export type BotId = "sniper" | "machinegun" | "tanque" | "browning"

const BOTS = {
  sniper: {
    apiKey: "MoAcsgKcNJFW1oXGqnKHm9sgn4iIMXtiDkdohXyjhdwevXQMEl9zTVXrOKYEefIp",
    apiSecret: "bBnH4g7LsLyN93cm38pWAsmTw8XNmV2HPXTpoCN4MmUZ66LxczHKpCt0H1FCQchW",
    table: "Burocrata1",
  },
  "machinegun": {
    apiKey: "7Hkxsg0nNxO5aBYClzs5k2BMZQ7PMbJf8ZW4t2RqDPLTwMbpBXFQagEFTpKnz2al",
    apiSecret: "ZFzoNo471lXwMehZijOUnUqxR3PE12uRCGw1vu4HLZzVUewPusWIc9xPdgG6Qldj",
    table: "MK_MG_12",
  },
  "tanque": {
    apiKey: "0Nr1Yk7r2zqdkN5HoYuNYAT2IMTnPzWYBoMIoeoYzX8W5SusxXvmyexsXL4G1A0w",
    apiSecret: "vumco848539uqrRNW3rFeBZB0mDBb0AYJHAZ7fbuQ8tDLnIIDr9VJSsStWrdxCwp",
    table: "T1122",
  },
  "browning": {
    apiKey: "1lbsvvyaB4p8fLpFKgGFjOnjGO2tsj3ZpJmGPoQXS83p2SKBF8ghOXo82f6LGfnR",
    apiSecret: "g07920rFuu4bFyL0VKwJRBx716PRL2h0O8Uf9H6xaAw7Kx4jjWd17b9tPsDrkSNp",
    table: "T2211",
  },
} as const

function isValidBotId(value: any): value is BotId {
  return value === "sniper" || value === "machinegun" || value === "tanque" || value === "browning"
}

function getBot(botId: any) {
  if (!isValidBotId(botId)) {
    console.error("BotId inválido recibido:", botId)
    throw new Error(`Bot inválido: ${botId}`)
  }

  return BOTS[botId]
}

// =========================
// BINANCE TIME SYNC
// =========================
const FAPI_BASE = "https://fapi.binance.com"

let timeOffsetMs = 0
let lastSync = 0

async function syncTime() {
  const now = Date.now()
  if (now - lastSync < 60_000) return

  const res = await fetch(`${FAPI_BASE}/fapi/v1/time`)
  const data = await res.json()

  timeOffsetMs = data.serverTime - Date.now()
  lastSync = now
}

// =========================
// BINANCE SIGNED REQUEST
// =========================
function signQuery(query: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(query).digest("hex")
}

async function signedRequest<T>(
  botId: BotId,
  method: "GET" | "POST" | "DELETE",
  path: string,
  retry = true,
): Promise<T> {
  const bot = getBot(botId)
  await syncTime()

  const timestamp = Date.now() + timeOffsetMs
  const qs = `timestamp=${timestamp}&recvWindow=5000`
  const signature = signQuery(qs, bot.apiSecret)
  const url = `${FAPI_BASE}${path}?${qs}&signature=${signature}`

  const res = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": bot.apiKey,
    },
  })

  if (!res.ok) {
    const text = await res.text()

    // retry automático si el timestamp falló
    try {
      const err = JSON.parse(text)
      if (err.code === -1021 && retry) {
        await syncTime()
        return signedRequest(botId, method, path, false)
      }
    } catch {}

    throw new Error(text)
  }

  return (await res.json()) as T
}

// =========================
// BALANCE
// =========================
export async function getFuturesUsdtBalance(botId: BotId): Promise<number> {
  type BalanceRow = {
    asset: string
    availableBalance: string
  }

  const data = await signedRequest<BalanceRow[]>(
    botId,
    "GET",
    "/fapi/v2/balance",
  )

  const usdt = data.find(d => d.asset === "USDT")
  return Number(usdt?.availableBalance ?? 0)
}

// =========================
// TYPES
// =========================
export interface Operation {
  id: number
  simbolo: string
  margen: number
  apalancamiento: number
  tipo_operacion: "BUY" | "SELL"
  resultado: number
  pnl: number
  fecha: string
  duracion: number
  sl_inicial: number
  pp_usado: string
  estrategia: string
  confirmacion: string
  modo_cierre: string
}

export interface Stats {
  balance: number
  totalPnl: number
  totalOperations: number
  wins: number
  losses: number
  winRate: number
}

// =========================
// STATS
// =========================
export async function getBotStats(botId: BotId): Promise<Stats> {
  const bot = getBot(botId)
  const balance = await getFuturesUsdtBalance(botId)

  const [rows] = await pool.query(`
    SELECT 
      COUNT(*) AS total_operations,
      SUM(CASE WHEN resultado > 0 THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN resultado < 0 THEN 1 ELSE 0 END) AS losses,
      SUM(pnl) AS total_pnl
    FROM ${bot.table}
  `)


  const r = (rows as any[])[0] || {}
  const totalOps = Number(r.total_operations ?? 0)
  const wins = Number(r.wins ?? 0)

  return {
    balance,
    totalPnl: Number(r.total_pnl ?? 0),
    totalOperations: totalOps,
    wins,
    losses: Number(r.losses ?? 0),
    winRate: totalOps > 0 ? (wins / totalOps) * 100 : 0,
  }
}

// =========================
// OPS
// =========================
export async function getRecentOperations(
  botId: BotId,
  limitInput = 50,
): Promise<Operation[]> {
  const bot = getBot(botId)

  const limit = Math.min(Math.max(limitInput, 1), 1000)

  const [rows] = await pool.query(`
    SELECT *
    FROM ${bot.table}
    ORDER BY fecha DESC
    LIMIT ${limit}
  `)

  return rows as Operation[]
}

export async function getDailyPnl(
  botId: BotId,
  year: number,
  month: number,
): Promise<Record<number, number>> {
  const bot = getBot(botId)

  const [rows] = await pool.execute(
    `
    SELECT 
      DAY(fecha) AS day,
      SUM(pnl) AS daily_pnl
    FROM ${bot.table}
    WHERE YEAR(fecha) = ? AND MONTH(fecha) = ?
    GROUP BY DAY(fecha)
    ORDER BY day
  `,
    [year, month],
  )

  const out: Record<number, number> = {}
  for (const row of rows as any[]) {
    out[row.day] = Number(row.daily_pnl ?? 0)
  }
  return out
}


export interface MonthlyStats {
  year: number
  month: number
  pnl: number
  roi: number
  operations: number
}

export async function getMonthlyStats(
  botId: BotId,
): Promise<MonthlyStats[]> {
  const bot = getBot(botId)

  const [rows] = await pool.query(
    `
    SELECT
      YEAR(fecha) AS year,
      MONTH(fecha) AS month,
      COUNT(*) AS operations,
      SUM(pnl) AS total_pnl
    FROM ${bot.table}
    GROUP BY YEAR(fecha), MONTH(fecha)
    ORDER BY YEAR(fecha) DESC, MONTH(fecha) DESC
    `
  )

  return (rows as any[]).map(row => ({
    year: Number(row.year),
    month: Number(row.month),
    operations: Number(row.operations),
    pnl: Number(row.total_pnl ?? 0),
    roi: Number(row.total_pnl ?? 0) * 100,
  }))
}

// =========================
// MOCK BOT COMMANDS
// =========================
export interface BotConfig {
  botId: BotId
  slPercentage: number
  accountPercentage: number
}

export async function startBot(config: BotConfig) {
  console.log("Starting bot:", config)
  return {
    success: true,
    message: `Bot ${config.botId} iniciado con ${config.accountPercentage}% y SL ${config.slPercentage}%`,
  }
}

export async function stopBot(botId: BotId) {
  console.log("Stopping bot:", botId)
  return {
    success: true,
    message: `Bot ${botId} detenido correctamente`,
  }
}

export async function getBotLogs(botId: BotId): Promise<string[]> {
  return [
    `[${botId}] Conexión a Binance OK`,
    `[${botId}] Balance consultado`,
    `[${botId}] Escaneando mercados`,
    `[${botId}] Señal detectada`,
    `[${botId}] Orden ejecutada`,
  ]
}

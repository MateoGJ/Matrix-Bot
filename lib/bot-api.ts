"use server"

import mysql from "mysql2/promise"
import crypto from "crypto"

// =========================
//  DB CONFIG + POOL
// =========================
const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "maximiliano1o1o",
  database: process.env.DB_NAME || "trading_db",
}

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: true,
})

// =========================
/** BINANCE FUTURES (USDT-M) CLIENT */
// =========================
const FAPI_KEY = process.env.BINANCE_API_KEY || "MoAcsgKcNJFW1oXGqnKHm9sgn4iIMXtiDkdohXyjhdwevXQMEl9zTVXrOKYEefIp"
const FAPI_SECRET = process.env.BINANCE_API_SECRET || "bBnH4g7LsLyN93cm38pWAsmTw8XNmV2HPXTpoCN4MmUZ66LxczHKpCt0H1FCQchW"
const FAPI_BASE = process.env.BINANCE_FAPI_BASE || "https://fapi.binance.com"

let timeOffsetMs = 0
let lastSync = 0

async function syncTimeOffset() {
  // Evita pegarle todo el tiempo: resync cada 60s
  const now = Date.now()
  if (now - lastSync < 60_000) return
  const res = await fetch(`${FAPI_BASE}/fapi/v1/time`)
  if (!res.ok) throw new Error(`Binance time error: ${res.status}`)
  const data = await res.json()
  // offset = serverTime - localTime
  timeOffsetMs = Number(data.serverTime) - Date.now()
  lastSync = now
}

function signQuery(query: string) {
  return crypto.createHmac("sha256", FAPI_SECRET).update(query).digest("hex")
}

type HttpMethod = "GET" | "POST" | "DELETE"

async function signedRequest<T = any>(
  method: HttpMethod,
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  if (!FAPI_KEY || !FAPI_SECRET) {
    throw new Error("Faltan BINANCE_API_KEY / BINANCE_API_SECRET en .env.local")
  }

  await syncTimeOffset()

  const finalParams = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) finalParams.set(k, String(v))
  }
  finalParams.set("timestamp", String(Date.now() + timeOffsetMs))
  finalParams.set("recvWindow", "5000")

  const qs = finalParams.toString()
  const signature = signQuery(qs)
  const url = `${FAPI_BASE}${path}?${qs}&signature=${signature}`

  const res = await fetch(url, {
    method,
    headers: { "X-MBX-APIKEY": FAPI_KEY },
  })

  if (!res.ok) {
    const text = await res.text()
    // si es -1021 re-sincronizamos y reintentamos 1 vez
    try {
      const errJson = JSON.parse(text)
      if (errJson && errJson.code === -1021) {
        await syncTimeOffset()
        return signedRequest(method, path, params)
      }
    } catch {}
    throw new Error(`Binance error ${res.status}: ${text}`)
  }

  return (await res.json()) as T
}

/** Balance de Futuros USDT-M (asset=USDT) -> availableBalance */
export async function getFuturesUsdtBalance(): Promise<number> {
  type BalanceRow = {
    accountAlias: string
    asset: string
    balance: string
    crossUnPnl: string
    availableBalance: string
    maxWithdrawAmount: string
    updateTime: number
  }

  const data = await signedRequest<BalanceRow[]>("GET", "/fapi/v2/balance")
  const usdt = data.find((d) => d.asset === "USDT")
  if (!usdt) return 0
  // availableBalance = lo disponible para tradear/retirar
  return Number(usdt.availableBalance ?? 0)
}

// =========================
//  TYPES
// =========================
export interface BotConfig {
  apiKey: string
  apiSecret: string
  slPercentage: number
  accountPercentage: number
  isRunning: boolean
}

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
//  QUERIES
// =========================
export async function getBotStats(): Promise<Stats> {
  // Balance real desde Binance Futures USDT-M
  const balance = await getFuturesUsdtBalance()

  const sql = `
    SELECT 
      COUNT(*)                                       AS total_operations,
      SUM(CASE WHEN resultado > 0 THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN resultado < 0 THEN 1 ELSE 0 END) AS losses,
      COALESCE(SUM(pnl), 0)                          AS total_pnl,
      AVG(CASE WHEN resultado > 0 THEN resultado ELSE NULL END) AS avg_win_rate
    FROM bot_1
    WHERE fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `
  const [rows] = await pool.query(sql)
  const r = (rows as any[])[0] || {}

  return {
    balance: Number(balance ?? 0),
    totalPnl: Number(r.total_pnl ?? 0),
    totalOperations: Number(r.total_operations ?? 0),
    wins: Number(r.wins ?? 0),
    losses: Number(r.losses ?? 0),
    winRate: Number(r.avg_win_rate ?? 0),
  }
}

export async function getRecentOperations(limitInput?: number) {
  let limit = Number(limitInput)
  if (!Number.isInteger(limit) || limit <= 0) limit = 50
  if (limit > 1000) limit = 1000

  const sql = `
    SELECT *
    FROM bot_1
    ORDER BY fecha DESC
    LIMIT ${limit}
  `
  const [rows] = await pool.query(sql)
  return rows as any[]
}

export async function getDailyPnl(year: number, month: number): Promise<Record<number, number>> {
  const sql = `
    SELECT 
      DAY(fecha) AS day,
      SUM(pnl)   AS daily_pnl
    FROM bot_1
    WHERE YEAR(fecha) = ? AND MONTH(fecha) = ?
    GROUP BY DAY(fecha)
    ORDER BY day
  `
  const [rows] = await pool.execute(sql, [year, month])

  const out: Record<number, number> = {}
  for (const row of rows as any[]) {
    out[row.day] = Number(row.daily_pnl ?? 0)
  }
  return out
}

// =========================
//  MOCK BOT CMDS
// =========================
export async function startBot(config: BotConfig): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Starting bot with config:", config)
    return {
      success: true,
      message: `Bot iniciado con ${config.accountPercentage}% de cuenta y SL de ${config.slPercentage}%`,
    }
  } catch (error) {
    return { success: false, message: `Error al iniciar bot: ${error}` }
  }
}

export async function stopBot(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Stopping bot...")
    return { success: true, message: "Bot detenido correctamente" }
  } catch (error) {
    return { success: false, message: `Error al detener bot: ${error}` }
  }
}

export async function getBotLogs(): Promise<string[]> {
  try {
    return [
      "[2025-08-19 18:30:15] - INFO - Conexión a Binance exitosa",
      "[2025-08-19 18:30:16] - INFO - Balance disponible consultado",
      "[2025-08-19 18:30:17] - INFO - Escaneando mercados...",
      "[2025-08-19 18:30:18] - INFO - Mercados filtrados: BTCUSDT, ETHUSDT, ADAUSDT",
      "[2025-08-19 18:30:19] - INFO - Señal detectada en BTCUSDT - BUY",
      "[2025-08-19 18:30:20] - INFO - Orden BUY ejecutada en BTCUSDT - 62.41 USDT",
      "[2025-08-19 18:30:25] - INFO - ROI actual: +2.3% - Ajustando PP...",
    ]
  } catch (error) {
    console.error("Error getting bot logs:", error)
    return []
  }
}

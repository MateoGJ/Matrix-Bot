"use server"

import mysql from "mysql2/promise"
import { MongoClient } from "mongodb"

// ==========================================
// 1. CONEXIÓN A MySQL (TiDB Cloud)
// ==========================================
const pool = mysql.createPool({
  host: "gateway01.sa-east-1.prod.aws.tidbcloud.com", // (Seguro lo cambiaste por el que te dio TiDB)
  port: 4000,                    
  user: "32razaG9mTxM2eN.root",                  
  password: "zuWI94yLHJdd5nMI",
  database: "bots_db",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
  ssl: {                         // 👈 ESTO ES LO QUE TE SOLUCIONA EL ERROR
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
})

// ==========================================
// 2. CONEXIÓN AL MONDONGO (Datos en Vivo y Radar)
// ==========================================
const MONGO_URI = "mongodb+srv://hwe430824_db_user:Bu5DxdJirxmfgP88@botardos.hoeukaj.mongodb.net/?appName=Botardos"
const DB_NAME = "trading_live"

// Declaramos la variable global para TypeScript
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // En desarrollo, usamos el objeto global para que la conexión 
  // sobreviva a los reinicios (Hot Reload) de Next.js
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGO_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // En producción (Vercel), es seguro crear una nueva conexión por instancia
  const client = new MongoClient(MONGO_URI);
  clientPromise = client.connect();
}

async function getMongoDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

// ==========================================
// 3. INTERFACES (Para que TypeScript no se queje)
// ==========================================
export interface ActiveTrade {
  symbol: string
  tipo: string
  margen: number
  pnlPct: number
  pnlActual: number
  estadoProteccion: "SL" | "PP"
  slInicial: number
  pnlSl: number
  roiProtegido: number
  pnlAsegurado: number
  tiempoActivo: string
  fechaInicio?: string
}

export interface BotSummary {
  id: string
  name: string
  status: "ONLINE" | "OFFLINE"
  version: string
  balance: number
  totalPnl: number
  winRate: number
  totalOperations: number
  activeTrade?: ActiveTrade | null
  rawConfig: any
}

export type BotId = string

export interface MonthlyStats {
  year: number
  month: number
  operations: number
  pnl: number
}

export interface Stats {
  totalPnl: number
  winRate: number
  totalOperations: number
}

// ==========================================
// 2. GET FLEET STATS (DATOS EN VIVO + SQL)
// ==========================================
export async function getFleetStats(): Promise<BotSummary[]> {
  try {
    const mongoDb = await getMongoDb();
    const botsEnMongo = await mongoDb.collection("bots").find({}).toArray();
    
    const fleetPromises = botsEnMongo.map(async (botMongo) => {
      const botId = botMongo.bot_id;
      
      let config = {};
      try { config = typeof botMongo.config_actual === 'string' ? JSON.parse(botMongo.config_actual) : botMongo.config_actual } catch(e){}

      let status: "ONLINE" | "OFFLINE" = "OFFLINE";
      if (botMongo.last_heartbeat) {
        const lastHb = new Date(botMongo.last_heartbeat).getTime();
        if ((Date.now() - lastHb) / 1000 / 60 <= 5) status = "ONLINE"; 
      }

      const opActiva = await mongoDb.collection("operaciones_activas").findOne({ bot_id: botId });
      let activeTrade = null;

      if (opActiva) {
        const apert = new Date(opActiva.timestamp_apertura).getTime();
        const minsActivo = Math.floor((Date.now() - apert) / 1000 / 60);
        
        activeTrade = {
          symbol: opActiva.simbolo,
          tipo: opActiva.tipo_operacion,
          margen: opActiva.cantidad_usdt || 0,
          pnlPct: opActiva.roi_actual || 0,
          pnlActual: opActiva.pnl_actual || 0,
          estadoProteccion: opActiva.estado_proteccion || "SL",
          slInicial: config.sl_porcentaje || 55,
          pnlSl: opActiva.pnl_sl || 0,
          // 👇 ACÁ LEEMOS TUS NUEVAS VARIABLES DEL MONDONGO
          roiProtegido: opActiva.porcentaje_protegido_actual || opActiva.porcentaje_protegido || 0,
          pnlAsegurado: opActiva.pnl_asegurado_usdt || opActiva.pnl_asegurado || 0,
          tiempoActivo: `${minsActivo}m`,
          fechaInicio: opActiva.timestamp_apertura
        };
      }

      const [rows] = await pool.query(`
        SELECT COUNT(*) as totalOperations, COALESCE(SUM(pnl), 0) as totalPnl, COALESCE(SUM(CASE WHEN pnl >= 0 THEN 1 ELSE 0 END), 0) as wins
        FROM historial_operaciones WHERE bot_id = ?
      `, [botId]);
      
      const stats = (rows as any[])[0];
      const winRate = stats.totalOperations > 0 ? (stats.wins / stats.totalOperations) * 100 : 0;

      return {
        id: botId,
        name: botId,
        version: config.version || "v1.0",
        status: status,
        balance: botMongo.balance_actual || 0,
        totalPnl: Number(stats.totalPnl),
        winRate: Number(winRate.toFixed(2)),
        totalOperations: Number(stats.totalOperations),
        activeTrade: activeTrade,
        rawConfig: config
      };
    });

    const fullFleet = await Promise.all(fleetPromises);
    return fullFleet.sort((a, b) => {
      const aAct = a.activeTrade ? 1 : 0;
      const bAct = b.activeTrade ? 1 : 0;
      if (bAct !== aAct) return bAct - aAct;
      return b.totalPnl - a.totalPnl;
    });
  } catch (error) {
    console.error("Error en getFleetStats:", error);
    return [];
  }
}

// ==========================================
// 5. HISTORIAL PARA LA TABLA (MySQL)
// ==========================================
export async function getRecentOperations(botId: string, limit = 500) {
  const [rows] = await pool.query(`
    SELECT * FROM historial_operaciones 
    WHERE bot_id = ? 
    ORDER BY fecha DESC 
    LIMIT ?
  `, [botId, limit]);

  return rows as any[];
}

// ==========================================
// 6. DATOS PARA EL CALENDARIO (Overview Mensual)
// ==========================================
export async function getMonthlyStats(botId: string) {
  const [rows] = await pool.query(`
    SELECT
      YEAR(fecha) AS year,
      MONTH(fecha) AS month,
      COUNT(*) AS operations,
      COALESCE(SUM(pnl), 0) AS total_pnl
    FROM historial_operaciones
    WHERE bot_id = ?
    GROUP BY YEAR(fecha), MONTH(fecha)
    ORDER BY YEAR(fecha) DESC, MONTH(fecha) DESC
  `, [botId]);

  return (rows as any[]).map(row => ({
    year: Number(row.year),
    month: Number(row.month),
    operations: Number(row.operations),
    pnl: Number(row.total_pnl),
  }));
}

// ==========================================
// 7. DATOS DIARIOS PARA EL CALENDARIO
// ==========================================
export async function getDailyPnl(
  botId: BotId,
  year: number,
  month: number,
): Promise<Record<number, number>> {
  const [rows] = await pool.query(`
    SELECT
      DAY(fecha) AS day,
      COALESCE(SUM(pnl), 0) AS daily_pnl
    FROM historial_operaciones
    WHERE bot_id = ?
      AND YEAR(fecha) = ?
      AND MONTH(fecha) = ?
    GROUP BY DAY(fecha)
    ORDER BY DAY(fecha) ASC
  `, [botId, year, month])

  return Object.fromEntries(
    (rows as any[]).map(row => [
      Number(row.day),
      Number(row.daily_pnl),
    ])
  )
}

// ==========================================
// 8. ESTADÍSTICAS GLOBALES DEL BOT
// ==========================================
export async function getBotStats(botId: BotId): Promise<Stats> {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*) AS totalOperations,
      COALESCE(SUM(pnl), 0) AS totalPnl,
      COALESCE(SUM(CASE WHEN pnl >= 0 THEN 1 ELSE 0 END), 0) AS wins
    FROM historial_operaciones
    WHERE bot_id = ?
  `, [botId])

  const row = (rows as any[])[0]
  const totalOperations = Number(row?.totalOperations ?? 0)
  const wins = Number(row?.wins ?? 0)

  return {
    totalPnl: Number(row?.totalPnl ?? 0),
    totalOperations,
    winRate: totalOperations > 0 ? (wins / totalOperations) * 100 : 0,
  }
}
// lib/bots-registry.ts

export interface BotConfig {
  id: string
  name: string
  version: string
  apiKey: string
  apiSecret: string
  description?: string
}

export const BOTS_REGISTRY: BotConfig[] = [
  {
    id: "sniper",
    name: "SNIPER",
    version: "v2.1",
    apiKey: "TuApiKeyDeBinanceOBybit_Sniper",
    apiSecret: "TuApiSecret_Sniper",
  },
  {
    id: "machinegun",
    name: "MACHINE GUN",
    version: "v1.8",
    apiKey: "TuApiKey_MG",
    apiSecret: "TuApiSecret_MG",
  },
  {
    id: "tanque",
    name: "TANQUE",
    version: "v2.0",
    apiKey: "TuApiKey_Tanque",
    apiSecret: "TuApiSecret_Tanque",
  },
  // ¡Acá podés seguir agregando los 14 bots tranquilamente!
]

// Función de ayuda para buscar un bot rápido
export function getBotRegistry(id: string): BotConfig | undefined {
  return BOTS_REGISTRY.find(bot => bot.id === id)
}
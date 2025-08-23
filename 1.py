from binance.client import Client
import mysql.connector
from binance import ThreadedWebsocketManager, FuturesType, ContractType
import requests
import pandas as pd
import logging
import time
import datetime
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytz
from decimal import Decimal, ROUND_DOWN
from binance.exceptions import BinanceAPIException
import json
import os
import math
import functools

# -----------------------------
# 🧾 LISTA DE CUENTAS
# -----------------------------

CUENTAS = {
    "principal": {
        "api_key": "MoAcsgKcNJFW1oXGqnKHm9sgn4iIMXtiDkdohXyjhdwevXQMEl9zTVXrOKYEefIp",
        "api_secret": "bBnH4g7LsLyN93cm38pWAsmTw8XNmV2HPXTpoCN4MmUZ66LxczHKpCt0H1FCQchW"
    },
    "1M": {
        "api_key": "1lbsvvyaB4p8fLpFKgGFjOnjGO2tsj3ZpJmGPoQXS83p2SKBF8ghOXo82f6LGfnR", 
        "api_secret": "g07920rFuu4bFyL0VKwJRBx716PRL2h0O8Uf9H6xaAw7Kx4jjWd17b9tPsDrkSNp"
        # 7Hkxsg0nNxO5aBYClzs5k2BMZQ7PMbJf8ZW4t2RqDPLTwMbpBXFQagEFTpKnz2al
        # ZFzoNo471lXwMehZijOUnUqxR3PE12uRCGw1vu4HLZzVUewPusWIc9xPdgG6Qldj
    },
    "5M": {
        "api_key": "0Nr1Yk7r2zqdkN5HoYuNYAT2IMTnPzWYBoMIoeoYzX8W5SusxXvmyexsXL4G1A0w",
        "api_secret": "vumco848539uqrRNW3rFeBZB0mDBb0AYJHAZ7fbuQ8tDLnIIDr9VJSsStWrdxCwp"
    }
}

# -----------------------------
# ✨ SELECCIONAR CUENTA
# -----------------------------
CUENTA_ACTIVA = "principal"  # Cambiá esto por "principal" - "1M" - "5M" cuando quieras

# -----------------------------
# 🔁 CREAR CLIENTE
# -----------------------------

def crear_cliente(nombre_cuenta):
    datos = CUENTAS.get(nombre_cuenta)
    if not datos:
        raise ValueError(f"[ERROR] Cuenta '{nombre_cuenta}' no encontrada.")
    return Client(
        api_key=datos["api_key"],
        api_secret=datos["api_secret"],
        requests_params={'timeout': 22}
    )

# Cliente inicial
client = crear_cliente(CUENTA_ACTIVA)



# --- WebSocket  ---

# -----------------------------
# Live klines via WebSocket
# -----------------------------
klines_live = {}   # klines_live[symbol][tf] = DataFrame
subscribed = set() # {symbol-tf} suscritos

# dictionary compartido de precios
live_price = {} # live_price[symbol] = last price


def handle_ticker(msg):  
    sym = msg['s'] 
    live_price[sym] = float(msg['c']) 

# --- Variables globales para control dinámico de transferencias ---
umbral_transferencia = 0.4      # Umbral mínimo para recargar futuros
incremento_retiro = 2.0       # Cuánto aumentar en cada ciclo
incremento_carga = 0.5

# -----------------------------
# Stats persistence
# -----------------------------
STATS_FILE = "stats.json"
if os.path.exists(STATS_FILE):
    with open(STATS_FILE,"r") as f:
        stats = json.load(f)
else:
    stats = {"wins":0,"losses":0}

def save_stats():
    with open(STATS_FILE,"w") as f:
        json.dump(stats, f)


# Configuración de MySQL
db_config = {
    'user': 'root',
    'password': 'maximiliano1o1o',
    'host': 'localhost',
    'database': 'trading_db'
}

# Configuración de logging (se registrará todo en "operaciones.log")
logging.basicConfig(filename='operaciones.log', level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Función para enviar notificación a diferentes chats de Telegram
def enviar_notificacion_telegram(mensaje, tipo):
    if tipo == 0:  # Para Nuevo Listado
        token = '7907455670:AAFMwuZN629dxoQ8Rdx-e-EEhU247salVS8'
        chat_id = '1861668101'
    if tipo == 1:  # Para SL negativo
        token = '7988085883:AAFuFjqMn-XZ9t3g2qBRlwscH5fFzrQOiDs'
        chat_id = '1861668101'
    else:  # X_Force_Bot
        token = '7988085883:AAFuFjqMn-XZ9t3g2qBRlwscH5fFzrQOiDs'
        chat_id = '1861668101'
    url = f'https://api.telegram.org/bot{token}/sendMessage?chat_id={chat_id}&text={mensaje}'
    requests.get(url)
    logging.info(f"Notificación Telegram enviada: {mensaje}")

# Conectar a la base de datos
def conectar_base_datos():
    try:
        conexion = mysql.connector.connect(**db_config)
        logging.info("Conexión a la base de datos exitosa")
        return conexion
    except mysql.connector.Error as err:
        logging.error(f"Error al conectar a la base de datos: {err}")
        print(f"Error al conectar a la base de datos: {err}")
        return None

def safe_float(x):
    """Convierte NaN a None para MySQL"""
    return None if (x is None or isinstance(x, float) and math.isnan(x)) else float(x)


# Guardar operación en la base de datos
def guardar_operacion(simbolo, margen, apalancamiento, tipo_operacion, resultado, pnl,
                      fecha_iso, duracion,
                      sl_inicial=None, pp_usado=None, estrategia=None,
                      confirmacion=None, modo_cierre=None):
    try:
        conexion = conectar_base_datos()
        cursor = conexion.cursor()

        # Tiempo local
        utc = pytz.utc
        loc = pytz.timezone("America/Argentina/Buenos_Aires")
        f_utc = utc.localize(datetime.strptime(fecha_iso, "%Y-%m-%dT%H:%M:%SZ"))
        f_loc = f_utc.astimezone(loc).strftime("%Y-%m-%d %H:%M:%S")

        # --- Captura de contexto de mercado ---

        df = klines_live[simbolo]["1m"].copy()

        # Calculamos las EMAs por seguridad (aunque ya se calculen antes)
        df["ema_100"] = df["close"].ewm(span=100, adjust=False).mean()
        df["ema_200"] = df["close"].ewm(span=200, adjust=False).mean()

        volumen_ultima_vela = safe_float(df.iloc[-1]['volume'])

        ticker = client.futures_ticker(symbol=simbolo)
        vol_monedas = safe_float(ticker.get('volume', 0))
        last_price = safe_float(ticker.get('lastPrice', 0))
        volumen_24h_usdt = safe_float(vol_monedas * last_price)

        trades_24h = int(ticker.get('count', 0))

        highs = df['high'].tail(14)
        lows = df['low'].tail(14)
        closes = df['close'].tail(14)

        tr = pd.concat([
            highs - lows,
            (highs - closes.shift(1)).abs(),
            (lows - closes.shift(1)).abs()
        ], axis=1).max(axis=1)

        atr_actual = safe_float(tr.mean())

        orderbook = client.futures_order_book(symbol=simbolo, limit=5)
        ask = float(orderbook['asks'][0][0])
        bid = float(orderbook['bids'][0][0])
        spread = safe_float(ask - bid)

        ema_100 = df['ema_100'].iloc[-1]
        ema_200 = df['ema_200'].iloc[-1]
        ema_diff = safe_float(ema_100 - ema_200)

        hora_utc = f_utc.hour
        if 0 <= hora_utc < 7:
            sesion = "ASIA"
        elif 7 <= hora_utc < 13:
            sesion = "EUROPA"
        else:
            sesion = "NY"

        # --- Insert a la base ---
        sql = """
        INSERT INTO bot_1
          (simbolo, margen, apalancamiento, tipo_operacion, resultado, pnl,
           fecha, duracion, sl_inicial, pp_usado, estrategia, confirmacion, modo_cierre,
           volumen_ultima_vela, volumen_24h, trades_24h, atr_actual, spread, ema_diff, sesion)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """

        vals = (simbolo, margen, apalancamiento, tipo_operacion, resultado, pnl,
                f_loc, duracion, sl_inicial, pp_usado, estrategia, confirmacion, modo_cierre,
                volumen_ultima_vela, volumen_24h_usdt, trades_24h, atr_actual, spread, ema_diff, sesion)

        cursor.execute(sql, vals)
        conexion.commit()
        cursor.close()
        conexion.close()
        print("📌 Operación con contexto guardada correctamente")

    except mysql.connector.Error as err:
        logging.error(f"[ERROR] Error al guardar operación en la base de datos: {err}")
        print(f"[ERROR] Error al guardar operación en la base de datos: {err}")
    except Exception as e:
        logging.error(f"[ERROR] Error inesperado al guardar operación: {e}")
        print(f"[ERROR] Error inesperado: {e}")





# guardar stats 
def save_stats():
    with open(STATS_FILE,"w") as f:
        json.dump(stats, f)


# --- Funciones de utilidad ---

def ajustar_precision(valor, step_size):
    precision = Decimal(str(step_size))
    valor_ajustado = (Decimal(valor) // precision) * precision
    return float(valor_ajustado)

# -------------------------
# Decorador para sincronizar timestamp con Binance y manejar errores
# -------------------------
def binance_request(default_return=None):
    """Decorador que inyecta server timestamp + recvWindow y captura errores."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Intento obtener serverTime y lo meto en kwargs
            try:
                server_time = client.get_server_time()['serverTime']  # ms
                kwargs.setdefault('recvWindow', 6000)
                kwargs['timestamp'] = int(server_time)
            except Exception as e:
                # Si no puedo obtener server_time, logueo pero dejo seguir (fallback)
                logging.warning(f"[WARN] No pude obtener server_time: {e}")
                # no retorno aún, intento ejecutar la función sin timestamp
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Manejo centralizado de errores: log + print + notificación (opcional)
                mensaje_error = f"[ERROR] Llamada a Binance falló en {func.__name__}: {e}"
                logging.error(mensaje_error)
                print(mensaje_error)
                try:
                    enviar_notificacion_telegram(mensaje_error, tipo=1)
                except Exception:
                    pass
                return default_return
        return wrapper
    return decorator


# -------------------------
# Funciones protegidas
# -------------------------
@binance_request(default_return=0)
def obtener_balance_disponible(timestamp=None, recvWindow=None):
    """
    Devuelve availableBalance (USDT) de la cuenta de futuros.
    Retorna 0 en caso de error.
    """
    cuenta = client.futures_account(recvWindow=recvWindow, timestamp=timestamp)
    balance_disponible = float(cuenta.get('availableBalance', 0))
    logging.info(f"Balance disponible obtenido: {balance_disponible} USDT")
    return balance_disponible


@binance_request(default_return=False)
def transferir_fondos_futuros(monto, timestamp=None, recvWindow=None):
    """
    Transferir desde Spot -> Futuros (type=1).
    Retorna True si ok, False si falla.
    """
    transferencia = client.futures_account_transfer(
        asset='USDT',
        amount=monto,
        type=1,  # Spot -> Futuros
        recvWindow=recvWindow,
        timestamp=timestamp
    )
    mensaje = f"  🧲\n✅ Transferencia realizada de {monto:.2f} USDT a la cuenta de futuros. Detalles: {transferencia}"
    logging.info(mensaje)
    print(mensaje)
    try:
        enviar_notificacion_telegram(mensaje, tipo="positivo")
    except Exception:
        pass
    return True


@binance_request(default_return=False)
def retirar_excedente_futuros(monto_exceso, timestamp=None, recvWindow=None):
    """
    Transferir desde Futuros -> Spot (type=2).
    Retorna True si ok, False si falla.
    """
    retiro = client.futures_account_transfer(
        asset='USDT',
        amount=monto_exceso,
        type=2,  # Futuros -> Spot
        recvWindow=recvWindow,
        timestamp=timestamp
    )
    mensaje = f"\n  🧲\n✅🤑 Se retiró el exceso de {monto_exceso:.2f} USDT de Futuros a Spot. Detalles: {retiro}"
    logging.info(mensaje)
    print(mensaje)
    try:
        enviar_notificacion_telegram(mensaje, tipo="positivo")
    except Exception:
        pass
    return True


# ——— Crear orden + SL inicial STOP_MARKET

def crear_orden(simbolo, porcentaje_cuenta, apalancamiento, direccion, monto_fijo_transferencia):
    try:
        # — margen y apalancamiento —
        balance = obtener_balance_disponible()
        cantidad_usdt = (porcentaje_cuenta/100)*balance
        print(f"\nUsando el {porcentaje_cuenta:.2f}% de {balance:.2f} USDT = {cantidad_usdt:.2f} USDT")
        
        # ajustar apalancamiento al máximo
        brackets = client.futures_leverage_bracket()
        info_lv = next(b for b in brackets if b['symbol']==simbolo.upper())
        max_lev = info_lv['brackets'][0]['initialLeverage']
        client.futures_change_leverage(symbol=simbolo.upper(), leverage=max_lev)
        apalancamiento = max_lev

        # — precio, cantidad —
        precio = float(client.futures_symbol_ticker(symbol=simbolo.upper())['price'])
        info = client.futures_exchange_info()
        sym_info = next(s for s in info['symbols'] if s['symbol']==simbolo.upper())
        step = float(next(f for f in sym_info['filters'] if f['filterType']=='LOT_SIZE')['stepSize'])
        min_qty = float(next(f for f in sym_info['filters'] if f['filterType']=='LOT_SIZE')['minQty'])
        tick_size = float(next(f for f in sym_info['filters'] if f['filterType']=='PRICE_FILTER')['tickSize'])
        cantidad = (cantidad_usdt*apalancamiento)/precio
        qty = ajustar_precision(cantidad, step)
        if qty < min_qty:
            qty = ajustar_precision(min_qty, step)
            cantidad_usdt = (qty*precio)/apalancamiento

        # — orden MARKET —
        side = 'BUY' if direccion=='l' else 'SELL'
        buy_sell = '🟢BUY👆🏼' if side=='BUY' else '👇🏼SELL🔴'
        while True:
            try:
                client.futures_create_order(symbol=simbolo.upper(), side=side, type='MARKET', quantity=qty)
                break
            except Exception as e:
                msg=str(e).lower()
                if "notional must be no smaller" in msg:
                    min_notional = float(next(f for f in sym_info['filters'] if f['filterType']=='MIN_NOTIONAL')['notional'])+1
                    qty = ajustar_precision(min_notional/precio, step)
                    cantidad_usdt=(qty*precio)/apalancamiento
                    if cantidad_usdt>balance:
                        transferir_fondos_futuros(monto_fijo_transferencia)
                        balance=obtener_balance_disponible()
                    continue
                else:
                    print(f"[ERROR] crear market: {e}")
                    return None
                
        print(f"\n  🧲\n✅Orden {buy_sell} plantada en {precio} con {cantidad_usdt:.2f} USDT {apalancamiento}x - {simbolo}")
        enviar_notificacion_telegram(f"  🧲\n✅Orden {buy_sell} en {simbolo} \ncon {cantidad_usdt:.2f} USDT - {apalancamiento}x", tipo="positivo")

        global inicio_operacion_global
        inicio_operacion_global = time.time()

        # — obtener precio entrada real —
        time.sleep(0.07)
        entry = float(next(p for p in client.futures_position_information() if p['symbol']==simbolo)['entryPrice'])
        ts = time.time()

        # — crear SL inicial STOP_MARKET —
        global sl_porcentaje
        if direccion=='l':
            raw_sp = entry*(1 - sl_porcentaje/100/apalancamiento)
            sl_side = 'SELL'
        else:
            raw_sp = entry*(1 + sl_porcentaje/100/apalancamiento)
            sl_side = 'BUY'
        
        # truncar al tick_size del mercado:
        precision = Decimal(str(tick_size))
        stop_price = float((Decimal(str(raw_sp)) // precision) * precision)

        # SL inicial dentro de crear_orden(...)
        sl_order = client.futures_create_order(
            symbol=simbolo.upper(),
            side=sl_side,
            type='STOP_MARKET',
            stopPrice=stop_price,
            closePosition=True
        )

        stop_order_id = sl_order['orderId']
        print(f"🚩 SL en {sl_porcentaje}%")
        return entry, qty, cantidad_usdt, apalancamiento, ts, stop_order_id

    except Exception as e:
        print(f"[ERROR] crear_orden fallo: {e}")
        return None




# Configuración de Profit Protection (PP)
pp_configurations = {
    "tendencial": {"nivel_roi_inicial": 111, "incremento_nivel_roi": 111, "primer_ajuste_sl": 0, "incremento_sl_post": 111},
    "moderada": {"nivel_roi_inicial": 111, "incremento_nivel_roi": 111, "primer_ajuste_sl": 61, "incremento_sl_post": 111},
    "conservadora": {"nivel_roi_inicial": 11, "incremento_nivel_roi": 11, "primer_ajuste_sl": 11, "incremento_sl_post": 11},
}


# PP y SL configuraciones distintas según timeframe
pp_por_tf = {
    "1m": pp_configurations["conservadora"],  # PP conservador en señales de 1m
    "5m": pp_configurations["moderada"]       # PP moderado en señales de 5m
}

sl_por_tf = {
    "1m": 111,  # Stop Loss más apretado si es señal de 1m
    "5m": 55   # Stop Loss normal si es señal de 5m
}


# ——————————————————————————————————————————————————————————
# ——— Monitoreo ROI + ajuste dinámico SL (PP)
# ——————————————————————————————————————————————————————————
def monitorear_roi_con_pp(config, pp_activado, simbolo, cantidad, cantidad_usdt, apalancamiento, direccion, stop_order_id, tf, confirm):
    nivel_roi     = config["nivel_roi_inicial"]
    sl_dinamico   = -sl_porcentaje
    primer_ajuste = False

    print("\n💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠")
    print("   🏁 STARTING MONITOREO...💎")
    print("   🤑 Okane Kasegu, Watashiwa Star⭐")
    print("💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠💠\n")

    while True:
        try:
            pos    = next(p for p in client.futures_position_information() if p['symbol'] == simbolo)
            position_amt = float(pos['positionAmt'])

            if position_amt == 0:
                # Si ya no hay posición, significa que se cerró de forma normal (SL/TP)
                print(f"✅ Posición en {simbolo} cerrada normalmente. Registrando cierre...")
                return registrar_cierre(simbolo, cantidad, cantidad_usdt, apalancamiento, direccion, 
                                        "TP" if primer_ajuste else "SL", stop_order_id, tf, confirm)

            unreal = float(pos['unRealizedProfit'])
            entry  = float(pos['entryPrice'])
            price  = float(client.futures_symbol_ticker(symbol=simbolo)['price'])
            roi    = (unreal / (entry * cantidad)) * apalancamiento * 100 if cantidad > 0 else 0

            # Profit Protection: reajustar SL dinámico
            if pp_activado == "si" and roi >= nivel_roi:
                sl_dinamico = config["primer_ajuste_sl"] if not primer_ajuste else sl_dinamico + config["incremento_sl_post"]
                primer_ajuste = True
                nivel_roi += config["incremento_nivel_roi"]

                # Cancelar SL actual y colocar uno nuevo
                try:
                    client.futures_cancel_order(symbol=simbolo, orderId=stop_order_id)
                except:
                    pass  # Si ya está ejecutado o cancelado, seguimos

                time.sleep(1.1)

                info     = client.futures_exchange_info()
                sym_info = next(s for s in info['symbols'] if s['symbol'] == simbolo.upper())
                tick_size= float(next(f for f in sym_info['filters'] if f['filterType']=='PRICE_FILTER')['tickSize'])

                if direccion == 'l':
                    raw_sp, sl_side = entry * (1 + sl_dinamico/100/apalancamiento), 'SELL'
                else:
                    raw_sp, sl_side = entry * (1 - sl_dinamico/100/apalancamiento), 'BUY'

                new_sp = float((Decimal(str(raw_sp)) // Decimal(str(tick_size))) * Decimal(str(tick_size)))

                sl = client.futures_create_order(
                    symbol=simbolo, side=sl_side, type='STOP_MARKET',
                    stopPrice=new_sp, closePosition=True
                )
                stop_order_id = sl['orderId']

                msg = f"  🧲\n🔒 PP ajustado a {sl_dinamico:.2f}%  |  en {new_sp}  |  PNL💲 {(sl_dinamico*cantidad_usdt)/100:.2f} USDT  |  ROI Actual: {roi:.2f}%"
                print(msg); enviar_notificacion_telegram(msg, tipo="positivo")

            time.sleep(0.07)

        except Exception as e:
            print(f"⚠️ Error en monitoreo de {simbolo}: {e}")

            # Verificar si el error se debe a que ya no hay posición
            try:
                pos = next(p for p in client.futures_position_information() if p['symbol'] == simbolo)
                position_amt = float(pos['positionAmt'])

                if position_amt == 0:
                    print(f"✅ Posición en {simbolo} ya cerrada al momento del error. Registrando cierre limpio...")
                    return registrar_cierre(simbolo, cantidad, cantidad_usdt, apalancamiento, direccion, 
                                            "TP" if primer_ajuste else "SL", stop_order_id, tf, confirm)

            except Exception as inner_e:
                print(f"⚠️ Error secundario al verificar posición: {inner_e}")

            # Si sigue habiendo posición, ahí sí aplicamos cortafuego
            try:
                orders = client.futures_get_open_orders(symbol=simbolo)
                for order in orders:
                    client.futures_cancel_order(symbol=simbolo, orderId=order['orderId'])
                print(f"🧹 Órdenes canceladas en {simbolo}")

                cerrar_operacion(simbolo, cantidad, cantidad_usdt, direccion)

                return registrar_cierre(simbolo, cantidad, cantidad_usdt, apalancamiento, direccion, 
                                        "Cortafuegos", None, tf, confirm)

            except Exception as err:
                print(f"❌ Error crítico al ejecutar cortafuego limpio: {err}")
                return registrar_cierre(simbolo, cantidad, cantidad_usdt, apalancamiento, direccion, 
                                        "Cortafuegos", None, tf, confirm)


def _futures_income(client, symbol, limit=100):
    # Compatibilidad por si tu lib usa otro nombre
    try:
        return client.futures_income_history(symbol=symbol, limit=limit)
    except AttributeError:
        return client.futures_income(symbol=symbol, limit=limit)

def obtener_pnl_ultima_posicion_neto(symbol, ventana_seg=300, limit=100, debug=False):
    """
    Devuelve el PnL NETO de la última posición cerrada:
    suma REALIZED_PNL + COMMISSION + FUNDING_FEE (+ extras) en una ventana de tiempo
    alrededor del último evento de income del símbolo.
    """
    ev = _futures_income(client, symbol, limit=limit)
    if not ev:
        return 0.0

    # Filtramos solo el símbolo y tipos relevantes
    tipos_ok = {"REALIZED_PNL", "COMMISSION", "FUNDING_FEE", "INSURANCE_CLEAR", "DELIVERED_SETTLEMENT"}
    ev = [e for e in ev if e.get("symbol") == symbol and e.get("incomeType") in tipos_ok]
    if not ev:
        return 0.0

    # Ordenamos por tiempo desc y agrupamos los más cercanos al último evento
    ev.sort(key=lambda x: int(x["time"]), reverse=True)
    t0 = int(ev[0]["time"])
    corte = ventana_seg * 1000

    bloque = [e for e in ev if (t0 - int(e["time"])) <= corte]

    # Sumamos ingresos (commission/funding suelen venir negativos)
    pnl_neto = sum(float(e.get("income", 0) or 0) for e in bloque)

    if debug:
        comp = {}
        for e in bloque:
            comp.setdefault(e["incomeType"], 0.0)
            comp[e["incomeType"]] += float(e.get("income", 0) or 0)
        print(f"[DEBUG PNL] bloque {symbol} t0={t0} ventana={ventana_seg}s -> {comp} = {pnl_neto:.6f}")

    return pnl_neto



# ——————————————————————————————————————————————————————————
# ——— Registro de cierre cuando SL real o TP
# ——————————————————————————————————————————————————————————
def registrar_cierre(simbolo, cantidad, cantidad_usdt, apalancamiento, direccion,
                     estado, stop_order_id=None, tf=None, confirm=None):
    # 1) PnL NETO del historial de posiciones (income)
    pnl_usdt = obtener_pnl_ultima_posicion_neto(simbolo, ventana_seg=300, limit=100, debug=False)

    # 2) ROI vs margen usado
    roi = (pnl_usdt / cantidad_usdt) * 100 if cantidad_usdt > 0 else 0.0

    # 3) Metadatos
    bs = "BUY" if direccion == "l" else "SELL"
    sl_inicial = sl_porcentaje
    pp_dict = pp_por_tf.get(tf, pp_por_tf.get('1m', {}))
    pp_usado = next((k for k, v in pp_configurations.items() if v == pp_dict), 'desconocido')
    tag = "Lose 🥵" if roi < 0 else "Profit 🤑"
    duracion = int(time.time() - inicio_operacion_global)

    if estado == "Cortafuegos":
        modo_cierre = "Cortafuegos"
    elif roi > 0:
        modo_cierre = "PP"
    else:
        modo_cierre = "SL"

    # 4) Persistencia
    guardar_operacion(
        simbolo=simbolo,
        margen=cantidad_usdt,
        apalancamiento=apalancamiento,
        tipo_operacion=bs,
        resultado=roi,
        pnl=pnl_usdt,
        fecha_iso=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        duracion=duracion,
        sl_inicial=-sl_inicial,
        pp_usado=pp_usado,
        estrategia=tf,
        confirmacion=confirm,
        modo_cierre=modo_cierre
    )

    # 5) Log & noti
    msg = f"\n  🧲\n💠 {simbolo} cerró {tag}\nROI {roi:.2f}% - PNL: {pnl_usdt:.2f} USDT\n"
    print(msg)
    enviar_notificacion_telegram(msg, tipo=0)
    return estado, roi






# ——————————————————————————————————————————————————————————
# ——— Cerrar operación MARKET (solo MARKET) 
# ——————————————————————————————————————————————————————————
def cerrar_operacion(simbolo, cantidad, cantidad_usdt, direccion):
    try:
        orden = client.futures_create_order(
            symbol=simbolo,
            side='SELL' if direccion=='l' else 'BUY',
            type='MARKET',
            quantity=cantidad,
            reduceOnly=True
        )
        cerrado = f"⚠️ Operación en {simbolo} cerrada 💣"
        print(cerrado)
        enviar_notificacion_telegram(cerrado, tipo="positivo")
    except BinanceAPIException as e:
        if e.code == -2022:
            print("⚠️ cerrar_operacion: ya no hay posición.")
        else:
            fuck = f"[ERROR] cerrar_operacion: {e}"
            print(fuck)
            enviar_notificacion_telegram(fuck, tipo="positivo")





# —————————————————————————————————————————————————————————————————————————————————————
# ——— Monitoreo de mercados (espera señal de cruce de ema confirmada por macd o adx)
# —————————————————————————————————————————————————————————————————————————————————————

ultimas_senales = {}  # { símbolo: { "1m": "l"|"s"|None, "5m": ... } }

def monitorear_mercados(market_list):
    """Revisa las señales de todos los mercados de la lista en este momento."""
    global sl_porcentaje

    for symbol in market_list:
        try:
            signal, tf, confirm, val = señal_ema_macd_adx(symbol)
            if signal is None:
                continue

            # Evitar operar si es la misma señal repetida
            if ultimas_senales.get(symbol, {}).get(tf) == signal:
                continue

            ultimas_senales.setdefault(symbol, {})[tf] = signal

            msg = f"\n🎯 Señal {'LONG' if signal == 'l' else 'SHORT'} en {symbol} [{tf}] confirmada por {confirm}={val}"
            print(msg)

            # Configuración por timeframe
            config_actual = pp_por_tf.get(tf, pp_por_tf["1m"])
            sl_porcentaje = sl_por_tf.get(tf, sl_porcentaje)

            # Crear orden
            orden = crear_orden(symbol, porcentaje_cuenta, apalaX, signal, monto_fijo_transferencia)
            if orden:
                _, qty, usdt, lev, _, stop_id = orden
                estado, roi = monitorear_roi_con_pp(
                    config_actual, pp_activado, symbol, qty, usdt, lev, signal, stop_id, tf, confirm
                )

                stats["wins"] += roi > 0
                stats["losses"] += roi <= 0
                stats["perdidas_consecutivas"] = stats.get("perdidas_consecutivas", 0) + (roi <= 0)
                save_stats()

                if stats["perdidas_consecutivas"] >= 3:
                    print(f"🚨 Pausa de seguridad de 10 min por 3 pérdidas consecutivas")
                    enviar_notificacion_telegram("🚨 Pausa por pérdidas consecutivas", tipo=1)
                    time.sleep(600)
                    stats["perdidas_consecutivas"] = 0

                balance_disponible = obtener_balance_disponible()
                print(f"🏆 Wins: {stats['wins']}  💀 Losses: {stats['losses']}  💰 Balance: {balance_disponible:.2f} USDT")
                enviar_notificacion_telegram(f"✅ Stats actualizados | 🏆 Wins: {stats['wins']}  💀 Losses: {stats['losses']}  💰 Balance: {balance_disponible:.2f} USDT", tipo=0)

        except Exception as e:
            print(f"⚠️ Error procesando {symbol}: {e}")



# -----------------------------
# FULL historical klines via REST
# -----------------------------
def fetch_last_klines_df(symbol, interval, limit=1111):
    """Obtiene solo las últimas velas necesarias para indicadores."""
    data = client.futures_klines(symbol=symbol, interval=interval, limit=limit)
    df = pd.DataFrame(
        data,
        columns=["open_time", "open", "high", "low", "close", "volume",
                 "close_time", "qav", "trades", "tbbav", "tbqav", "ignore"]
    )
    for c in ["open", "high", "low", "close", "volume"]:
        df[c] = df[c].astype(float)
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
    return df[["open_time", "open", "high", "low", "close", "volume"]]




def handle_kline(msg):
    payload = msg.get("data", msg)
    sym = payload.get("ps")  # FUTURES: viene en 'ps'
    if not sym:
        print(f"⚠️ handle_kline: no pude encontrar 'ps' en payload, keys= {list(payload.keys())}")
        return

    k = payload.get("k", {})
    tf = k.get("i")
    closed = k.get("x")
    price = k.get("c")

    # actualizar precio en vivo
    live_price[sym] = float(price)

    # construir fila de vela
    row = {
        "open_time": pd.to_datetime(k["t"], unit="ms"),
        "open": float(k["o"]),
        "high": float(k["h"]),
        "low": float(k["l"]),
        "close": float(k["c"]),
        "volume": float(k["v"])
    }

    # asegurarse de que esté inicializado
    if sym not in klines_live or tf not in klines_live[sym]:
        klines_live.setdefault(sym, {})[tf] = fetch_last_klines_df(sym, tf, k["t"])

    df = klines_live[sym][tf]

    # si existe la vela con ese timestamp, actualiza
    if row["open_time"] in df["open_time"].values:
        df.loc[df["open_time"] == row["open_time"], list(row.keys())] = list(row.values())
    else:
        klines_live[sym][tf] = pd.concat([df, pd.DataFrame([row])], ignore_index=True)



def ensure_ws_subscriptions(symbols, intervals=None):
    global timeframes_usados

    # Garantizar que siempre tengamos 1m para confirmar
    tf_confirm = "1m"
    if tf_confirm not in timeframes_usados:
        intervals = list(timeframes_usados) + [tf_confirm]
    else:
        intervals = timeframes_usados if intervals is None else intervals

    for sym in symbols:
        klines_live.setdefault(sym, {})
        for tf in intervals:
            key = f"{sym}-{tf}"
            if key not in subscribed:
                # 🔹 Precarga rápida (solo 300 velas)
                klines_live[sym][tf] = fetch_last_klines_df(sym, tf, 1111)
                print(f"📥 Histórico rápido {sym} {tf}: {len(klines_live[sym][tf])} velas")

                # WebSocket de Binance Futures
                twm.start_kline_futures_socket(
                    callback=handle_kline,
                    symbol=sym,
                    interval=tf
                )
                subscribed.add(key)
                print(f"🔌 WebSocket FUTURES suscrito para {sym} {tf}")


# -----------------------------
# Indicator calculation
# -----------------------------
def calcular_indicadores(df):
    # EMAs (rápidas y de tendencia)
    df["ema_fast"] = df["close"].ewm(span=9, adjust=False).mean()
    df["ema_slow"] = df["close"].ewm(span=26, adjust=False).mean()
    df["ema_100"] = df["close"].ewm(span=100, adjust=False).mean()
    df["ema_200"] = df["close"].ewm(span=200, adjust=False).mean()

    # MACD (12,26,9)
    ema12 = df["close"].ewm(span=12, adjust=False).mean()
    ema26 = df["close"].ewm(span=26, adjust=False).mean()
    df["macd"] = ema12 - ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]

    # ADX
    df["high_prev"] = df["high"].shift(1)
    df["low_prev"] = df["low"].shift(1)
    df["tr"] = df.apply(lambda r: max(
        r["high"] - r["low"],
        abs(r["high"] - r["close"]),
        abs(r["low"]  - r["close"])
    ), axis=1)
    df["plus_dm"] = df["high"].diff().where(lambda x: x > 0, 0.0)
    df["minus_dm"] = (-df["low"].diff()).where(lambda x: x > 0, 0.0)

    df["tr14"] = df["tr"].rolling(window=14).sum()
    df["plus_dm14"] = df["plus_dm"].rolling(window=14).sum()
    df["minus_dm14"] = df["minus_dm"].rolling(window=14).sum()

    df["plus_di"] = 100 * df["plus_dm14"] / df["tr14"]
    df["minus_di"] = 100 * df["minus_dm14"] / df["tr14"]
    df["dx"] = 100 * (df["plus_di"] - df["minus_di"]).abs() / (df["plus_di"] + df["minus_di"])
    df["adx"] = df["dx"].rolling(window=14).mean()

    # Eliminar columnas auxiliares
    return df.drop(columns=["high_prev", "low_prev", "tr14", "plus_dm14", "minus_dm14"])


def señal_ema_macd_adx(symbol):
    """
    Detecta señales LONG o SHORT basadas en cruces de EMA (fast vs slow),
    confirmadas por MACD o ADX. Filtra por spread, atr, trades_24h y volumen_24h.
    El filtro ema_diff queda comentado para poder reactivarlo si se desea.
    """

    # --- Asegurar 1m como tf de confirmación ---
    tf_operativos = timeframes_usados.copy()
    if "1m" not in tf_operativos:
        tf_operativos.append("1m")

    # --- Chequeo de data mínima en memoria ---
    for tf in tf_operativos:
        if len(klines_live.get(symbol, {}).get(tf, [])) < 200:
            return None, None, None, None

    # --- Calculamos indicadores por TF ---
    dfs = {tf: calcular_indicadores(klines_live[symbol][tf]) for tf in tf_operativos}
    df1 = dfs.get("1m")
    l1 = df1.iloc[-1] if df1 is not None else None

    # --------------------
    # FILTROS DE CONTEXTO (afinados)
    # --------------------
    # RANGOS derivados del análisis de días 4–7:
    SPREAD_MIN = 0.00002
    SPREAD_MAX = 0.00009
    ATR_MIN    = 0.00021
    ATR_MAX    = 0.00041
    TRADES_MAX = 160_000
    VOL24H_MAX = 15_000_000  # en USDT

    filtros = {
        "spread": False,
        # "ema_diff": False,  # <-- seguimos sin usarlo a propósito
        "atr": False,
        "trades_24h": False,
        "volumen_24h": False
    }

    try:
        # --- Ticker y orderbook ---
        ticker = client.futures_ticker(symbol=symbol)
        vol_24h_usdt = float(ticker.get("volume", 0)) * float(ticker.get("lastPrice", 0))
        trades_24h   = int(ticker.get("count", 0))

        orderbook = client.futures_order_book(symbol=symbol, limit=5)
        ask = float(orderbook['asks'][0][0]); bid = float(orderbook['bids'][0][0])
        spread = ask - bid

        # --- ATR rápido en 1m (promedio de high-low últimas 14) ---
        atr = df1['high'].tail(14).subtract(df1['low'].tail(14)).mean()

        # --- Opcional: diff de EMAs de tendencia (no activado) ---
        # ema_diff_actual = l1.ema_100 - l1.ema_200

        # -------------------
        # Evaluación de filtros
        # -------------------
        if (SPREAD_MIN < spread < SPREAD_MAX):
            filtros["spread"] = True

        if (ATR_MIN <= atr <= ATR_MAX):
            filtros["atr"] = True

        if trades_24h <= TRADES_MAX:
            filtros["trades_24h"] = True

        if vol_24h_usdt <= VOL24H_MAX:
            filtros["volumen_24h"] = True

        # --- Log de filtros ---
        total_ok = sum(filtros.values())
        status = ["✅" if v else "❌" for v in filtros.values()]
        nombres = list(filtros.keys())
        resumen = f"🔍 {symbol} | Filtros cumplidos: {total_ok}/{len(filtros)} -> "
        resumen += " | ".join([f"{n}: {s}" for n, s in zip(nombres, status)])
        print(resumen)

        if total_ok < len(filtros):
            return None, None, None, None

    except Exception as e:
        print(f"⚠️ {symbol}: Error al obtener contexto: {e}")
        return None, None, None, None

    # --------------------
    # LÓGICA DE SEÑALES
    # --------------------
    for tf in timeframes_usados:
        df = dfs[tf]
        p, l = df.iloc[-2], df.iloc[-1]

        tolerancia = 0.0001
        cross_long  = (p.ema_fast < p.ema_slow + tolerancia) and (l.ema_fast > l.ema_slow)
        cross_short = (p.ema_fast > p.ema_slow - tolerancia) and (l.ema_fast < l.ema_slow)

        tendencia_alcista = (l.ema_100 > l.ema_200) and (l.close > l.ema_100)
        tendencia_bajista = (l.ema_100 < l.ema_200) and (l.close < l.ema_100)

        if df1 is not None:
            macd_diff = float(l1.macd - l1.macd_signal)
            macd_hist = float(l1.macd_hist)
            adx_val   = float(l1.adx)

            confirma_macd_l = (macd_diff > 0) or (macd_hist > 0)
            confirma_macd_s = (macd_diff < 0) or (macd_hist < 0)
            confirma_adx    = adx_val > 20
        else:
            confirma_macd_l = confirma_macd_s = confirma_adx = False
            macd_diff = 0; adx_val = 0

        if cross_long and tendencia_alcista and (confirma_macd_l or confirma_adx):
            return "l", tf, ("MACD" if confirma_macd_l else "ADX"), round(macd_diff if confirma_macd_l else adx_val, 8)

        if cross_short and tendencia_bajista and (confirma_macd_s or confirma_adx):
            return "s", tf, ("MACD" if confirma_macd_s else "ADX"), round(macd_diff if confirma_macd_s else adx_val, 8)

    return None, None, None, None


def obtener_sesion_actual_utc(now=None):
    """
    Sesiones por UTC:
      - ASIA:   00:00–06:59
      - EUROPA: 07:00–12:59
      - NY:     13:00–23:59
    """
    now = now or datetime.utcnow()
    h = now.hour
    if 0 <= h < 7:
        return "ASIA"
    elif 7 <= h < 13:
        return "EUROPA"
    else:
        return "NY"

def segundos_hasta_fin_de_asia(now=None):
    """
    Devuelve los segundos hasta las 07:00 UTC (fin de ASIA).
    Si ya pasaron las 07:00, calcula el fin de ASIA del día siguiente.
    """
    now = now or datetime.utcnow()
    end = now.replace(hour=7, minute=0, second=0, microsecond=0)
    if now >= end:
        end = (now + timedelta(days=1)).replace(hour=7, minute=0, second=0, microsecond=0)
    return max(1, int((end - now).total_seconds()))


# -----------------------------
# ♻️ REINICIAR CLIENTE
# -----------------------------

def reinicializar_cliente():
    global client
    try:
        client = crear_cliente(CUENTA_ACTIVA)
        client.futures_exchange_info()  # Confirmar conexión
        logging.info(f"[LOG] Cliente reinicializado para cuenta '{CUENTA_ACTIVA}' y exchangeInfo actualizado.")
        print(f"[LOG] Cliente reinicializado para cuenta '{CUENTA_ACTIVA}' y exchangeInfo actualizado.")
    except Exception as e:
        logging.error(f"[ERROR] Error al reinicializar el cliente de Binance: {e}")
        print("[ERROR] Error al reinicializar el cliente de Binance:", e)


# Lista de símbolos a excluir (ejemplo: mercados con precios muy altos)
EXCEPTION_MARKETS = ["PAXGUSDT", "SXTUSDT", "BTCUSDT", "ETHUSDT", "BNBUSDT"]  # Agrega aquí los símbolos que querés filtrar

# === Límites compartidos por ambas funciones ===
SPREAD_MIN = 0.00002
SPREAD_MAX = 0.00009
ATR_MIN    = 0.00021
ATR_MAX    = 0.00041
TRADES_MAX = 160_000
VOL24H_MAX = 15_000_000  # USDT


def obtener_mercados_filtrados(debug=True):
    """
    Escanea TODOS los símbolos PERPETUAL-USDT y devuelve los que pasen los mismos filtros
    que usa señal_ema_macd_adx:
      - SPREAD_MIN < spread < SPREAD_MAX     (order book)
      - ATR_MIN <= ATR <= ATR_MAX            (1m, promedio de high-low últimas 14)
      - trades_24h <= TRADES_MAX             (ticker 'count')
      - vol_24h_usdt <= VOL24H_MAX           (ticker volume * lastPrice)
    """
    try:
        # 1) Lista de PERPETUAL-USDT
        data = requests.get("https://fapi.binance.com/fapi/v1/exchangeInfo", timeout=10).json()
        symbols_info = [
            s["symbol"] for s in data.get("symbols", [])
            if s.get("contractType") == "PERPETUAL"
            and s["symbol"].endswith("USDT")
            and "USDC" not in s["symbol"]
            and s["symbol"] not in EXCEPTION_MARKETS
        ]

        # 2) Tickers bulk
        tickers = {t["symbol"]: t for t in client.futures_ticker()}

        mercados_filtrados = []

        for sym in symbols_info:
            try:
                # --- ticker (vol y count) ---
                t = tickers.get(sym, {})
                last_price     = float(t.get("lastPrice", 0) or 0)
                base_volume    = float(t.get("volume", 0) or 0)        # en base asset
                vol_24h_usdt   = base_volume * last_price
                trades_24h     = int(t.get("count", 0) or 0)

                # trades / vol (mismo criterio que señal)
                if trades_24h > TRADES_MAX:
                    if debug: print(f"❌ {sym} descartado por trades_24h ({trades_24h} > {TRADES_MAX})")
                    continue
                if vol_24h_usdt > VOL24H_MAX:
                    if debug: print(f"❌ {sym} descartado por volumen_24h ({vol_24h_usdt:.2f} > {VOL24H_MAX})")
                    continue

                # --- spread (order book) ---
                ob  = client.futures_order_book(symbol=sym, limit=5)
                ask = float(ob["asks"][0][0]); bid = float(ob["bids"][0][0])
                spread = ask - bid
                if not (SPREAD_MIN < spread < SPREAD_MAX):
                    if debug: print(f"❌ {sym} descartado por spread ({spread:.10f} no está entre {SPREAD_MIN} y {SPREAD_MAX})")
                    continue

                # --- ATR (1m, avg high-low de 14) ---
                kl = client.futures_klines(symbol=sym, interval="1m", limit=20)
                if len(kl) < 15:
                    if debug: print(f"❌ {sym} sin velas suficientes para ATR")
                    continue
                highs = [float(k[2]) for k in kl][-14:]
                lows  = [float(k[3]) for k in kl][-14:]
                atr   = sum(h - l for h, l in zip(highs, lows)) / 14.0

                if not (ATR_MIN <= atr <= ATR_MAX):
                    if debug: print(f"❌ {sym} descartado por ATR ({atr:.10f} fuera de {ATR_MIN}–{ATR_MAX})")
                    continue

                if debug: print(f"✅ {sym} ACEPTADO")
                mercados_filtrados.append(sym)

            except Exception as e:
                if debug: print(f"⚠️ Error con {sym}: {e}")
                continue

        return mercados_filtrados

    except Exception as e:
        print(f"⚠️ Error general en obtener_mercados_filtrados: {e}")
        return []






def obtener_posiciones_abiertas():
    try:
        posiciones = client.futures_position_information()
        posiciones_abiertas = [
            posicion['symbol'] for posicion in posiciones
            if float(posicion['positionAmt']) != 0
        ]
        return posiciones_abiertas
    except Exception as e:
        logging.error(f"Error al obtener posiciones abiertas: {e}")
        print(f"⚠️ Error al obtener posiciones abiertas: {e}")
        return []

# -------------------------
# Lógica principal de balance dinámico (la podés dejar igual, ya usa las funciones anteriores)
# -------------------------
def verificar_y_transferir_balance():
    global monto_fijo_transferencia, max_balance_deseado, umbral_transferencia, incremento_retiro, incremento_carga

    balance_disponible = obtener_balance_disponible()
    print(f"\n🤑💰💸 Balance: {balance_disponible:.2f} USDT 💲💎🤑\n")

    # --- Si hay exceso, retirar a Spot y aumentar los umbrales ---
    if balance_disponible > max_balance_deseado:
        exceso = balance_disponible - max_balance_deseado
        statuus = (f"💎♻💸 Balance {balance_disponible:.2f}USDT > Max {max_balance_deseado:.2f}USDT, retiro {exceso:.2f} USDT 💲🤑💎")
        print(statuus)
        retirar_excedente_futuros(round(exceso, 2))

        # Aumentar umbrales y monto a recargar SOLO CUANDO HAY EXCEDENTE
        max_balance_deseado += incremento_retiro
        monto_fijo_transferencia += incremento_carga
        umbral_transferencia += 0.2

        print(f"📈 max_balance_deseado aumentado a {max_balance_deseado}")
        print(f"📈 monto_fijo_transferencia ahora es {monto_fijo_transferencia}")
        print(f"📈 umbral_transferencia aumentado a {umbral_transferencia}\n")
        enviar_notificacion_telegram(statuus, tipo="positivo")

    # --- Si hay poco balance, recargar desde Spot ---
    elif balance_disponible < umbral_transferencia:
        status = (f"⚡🚩 Balance bajo... ({balance_disponible:.2f} USDT), recargando {monto_fijo_transferencia} USDT... 😉🤑💪🏽")
        print(status)
        transferir_fondos_futuros(round(monto_fijo_transferencia, 2))
        # ❌ No aumenta umbrales ni monto_fijo_transferencia aquí
        enviar_notificacion_telegram(status, tipo="positivo")


# -------------------------
# Función de debug para ver desajuste horario
# -------------------------
def debug_time_sync():
    try:
        st = client.get_server_time()['serverTime']
        local_ms = int(time.time() * 1000)
        diff = local_ms - int(st)
        print(f"[TIME DEBUG] server_time: {st}  local_ms: {local_ms}  diff_ms(local - server): {diff} ms")
        logging.info(f"[TIME DEBUG] diff_ms: {diff}")
    except Exception as e:
        print(f"[TIME DEBUG] error obteniendo server_time: {e}")


## --- Bloque principal ---
if __name__ == "__main__":
    # Parámetros iniciales
    porcentaje_cuenta         = 11 #float(input("Ingresa el porcentaje de tu cuenta para usar en cada operación (ej. 5 para 5%): "))
    apalaX                    = 99997777   # temporal
    tp_porcentaje             = 99997777   # temporal
    sl_porcentaje             = 88.88
    pp_activado               = "si"
    max_balance_deseado       = 11 #float(input("Después de cuánto retirar? (ej. 10 USDT): "))
    monto_fijo_transferencia  = 1 #float(input("¿Cuánto transferir si se queda sin dinero? (ej. 5 USDT): "))

    # print("\n🧭 Elige los timeframes a usar:")
    # print("1 - Solo 1m")
    # print("2 - Solo 5m")
    # print("3 - Ambos (1m y 5m)")
    opcion_tf = "1" #input("Selecciona una opción (1, 2 o 3): ").strip()

    if opcion_tf == "1":
        timeframes_usados = ["1m"]
    elif opcion_tf == "2":
        timeframes_usados = ["5m"]
    elif opcion_tf == "3":
        timeframes_usados = ["1m", "5m"]
    else:
        raise ValueError("⛔ Opción inválida. Solo se permite 1, 2 o 3.")

    print(f"\n🕒 Timeframes seleccionados: {', '.join(timeframes_usados)}")

    # Arranca WebSocket manager
    twm = ThreadedWebsocketManager()
    twm.start()

    ultimas_senales.clear()
    simbolos_filtrados = []

    while True:
        try:
            # 1️⃣ Balance y recarga si hace falta
            verificar_y_transferir_balance()

            # 2️⃣ Buscar mercados filtrados (rápido)
            print("\n🔎 Escaneando mercados que pasen filtros...\n")
            nuevos_simbolos = obtener_mercados_filtrados(debug=True)

            if not nuevos_simbolos:
                print("⚠️ No se encontraron mercados válidos. Esperando 10 minutos...\n")
                time.sleep(1111)
                continue

            print(f"\n📈 Mercados filtrados: {', '.join(nuevos_simbolos)}")

            # 3️⃣ Suscribir solo a mercados nuevos
            nuevos_a_suscribir = list(set(nuevos_simbolos) - set(simbolos_filtrados))
            if nuevos_a_suscribir:
                ensure_ws_subscriptions(nuevos_a_suscribir, intervals=timeframes_usados)
                print(f"🔌 Suscritos {len(nuevos_a_suscribir)} nuevos mercados.")

            # 4️⃣ Actualizar lista actual
            simbolos_filtrados = nuevos_simbolos

            # 5️⃣ Monitorear durante 10 minutos
            tiempo_inicio = time.time()
            while time.time() - tiempo_inicio < 1111:
                monitorear_mercados(simbolos_filtrados)
                time.sleep(1)  # Frecuencia de chequeo

        except KeyboardInterrupt:
            print("🚪 Detenido por usuario.")
            twm.stop()
            break
        except Exception as e:
            print(f"⚠️ Error inesperado: {e}")
            time.sleep(11)

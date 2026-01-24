// lib/bot-runner.ts
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";

type BotState = {
  proc: ChildProcessWithoutNullStreams | null;
  startedAt: number | null;
  logs: string[];
  listeners: Set<(line: string) => void>;
  lockPath: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __BOT_STATE__: BotState | undefined;
}

// ---------- SINGLETON GLOBAL (persiste entre hot-reloads) ----------
const state: BotState =
  global.__BOT_STATE__ ||
  {
    proc: null,
    startedAt: null,
    logs: [],
    listeners: new Set(),
    lockPath: path.resolve(process.cwd(), ".bot.lock"),
  };

global.__BOT_STATE__ = state;

// ---------- CONFIG ----------
const MAX_LOG_LINES = 2000;
const PYTHON = process.env.PYTHON_PATH || "python"; // en Windows: "py"
const BOT_SCRIPT = process.env.BOT_SCRIPT_PATH || path.resolve(process.cwd(), "1.py");

// ---------- UTILS ----------
function pushLog(line: string) {
  const l = line.endsWith("\n") ? line : line + "\n";
  state.logs.push(l);
  if (state.logs.length > MAX_LOG_LINES) state.logs.splice(0, state.logs.length - MAX_LOG_LINES);
  for (const cb of state.listeners) {
    try { cb(l); } catch {}
  }
}

function writeLock(pid: number) {
  try {
    fs.writeFileSync(state.lockPath, String(pid), { encoding: "utf8" });
  } catch (e) {
    pushLog(`\n>>> LOCK WRITE ERROR: ${String(e)}\n`);
  }
}

function readLockPid(): number | null {
  try {
    if (!fs.existsSync(state.lockPath)) return null;
    const txt = fs.readFileSync(state.lockPath, "utf8").trim();
    const n = Number(txt);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function removeLock() {
  try {
    if (fs.existsSync(state.lockPath)) fs.unlinkSync(state.lockPath);
  } catch (e) {
    pushLog(`\n>>> LOCK REMOVE ERROR: ${String(e)}\n`);
  }
}

function pidAlive(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0); // no mata, sólo chequea
    return true;
  } catch {
    return false;
  }
}

// ---------- API EXPUESTA ----------
export function subscribeLogs(cb: (line: string) => void) {
  state.listeners.add(cb);
  return () => state.listeners.delete(cb);
}

export function getBufferedLogs(): string[] {
  return [...state.logs];
}

export function isRunning() {
  // chequeo doble: proceso en memoria y lock en disco
  const memAlive = !!state.proc && !state.proc.killed && pidAlive(state.proc.pid || null);
  if (memAlive) return true;
  const lockPid = readLockPid();
  return pidAlive(lockPid);
}

export function getStatus() {
  return {
    running: isRunning(),
    pid: state.proc?.pid ?? readLockPid(),
    startedAt: state.startedAt,
    script: BOT_SCRIPT,
  };
}

export async function startBot(): Promise<{ ok: true; pid?: number } | { ok: false; error: string }> {
  // ⛔️ Idempotente por lock y por proc en memoria
  if (isRunning()) {
    const lockPid = readLockPid();
    pushLog(`\n>>> START SKIPPED: already running (pid=${lockPid ?? state.proc?.pid ?? "?"})\n`);
    return { ok: true, pid: lockPid ?? state.proc?.pid ?? undefined };
  }

  // si hay lock huérfano, limpiarlo
  const stale = readLockPid();
  if (stale && !pidAlive(stale)) removeLock();

  try {
    const proc = spawn(PYTHON, ["-u", "-X", "utf8", BOT_SCRIPT], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PYTHONIOENCODING: "utf-8",
      },
      detached: false,
    });

    state.proc = proc;
    state.startedAt = Date.now();
    writeLock(proc.pid ?? 0);

    pushLog(`\n>>> BOT STARTED (pid=${proc.pid}) at ${new Date(state.startedAt).toISOString()}\n`);

    proc.stdout.on("data", (chunk) => pushLog(chunk.toString()));
    proc.stderr.on("data", (chunk) => pushLog(chunk.toString()));

    proc.on("exit", (code, sig) => {
      pushLog(`\n>>> BOT EXITED (code=${code}, signal=${sig ?? ""})\n`);
      state.proc = null;
      state.startedAt = null;
      removeLock();
    });

    return { ok: true, pid: proc.pid };
  } catch (e: any) {
    state.proc = null;
    state.startedAt = null;
    removeLock();
    pushLog(`\n>>> START ERROR: ${e?.message || e}\n`);
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function stopBot(): Promise<{ ok: true } | { ok: false; error: string }> {
  // intenta matar el proceso en memoria; si no, usa lock PID
  const pid = state.proc?.pid ?? readLockPid();

  if (!pidAlive(pid)) {
    removeLock();
    return { ok: false, error: "Bot no está corriendo" };
  }

  try {
    if (state.proc && state.proc.pid === pid) {
      state.proc.kill("SIGINT");
    } else {
      // proceso no asociado al objeto (p. ej. otro worker) → matar por PID
      try { process.kill(pid!, "SIGINT" as any); } catch {}
    }

    pushLog("\n>>> SENDING SIGINT TO BOT...\n");

    // fallback: SIGKILL si no murió en 4s
    setTimeout(() => {
      if (pidAlive(pid)) {
        try { process.kill(pid!, "SIGKILL" as any); } catch {}
        pushLog("\n>>> SIGKILL SENT\n");
      }
      removeLock();
      state.proc = null;
      state.startedAt = null;
    }, 4000);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// lib/bot-runner.ts
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";

type BotState = {
  proc: ChildProcessWithoutNullStreams | null;
  startedAt: number | null;
  logs: string[];
  listeners: Set<(line: string) => void>;
};

const state: BotState = {
  proc: null,
  startedAt: null,
  logs: [],
  listeners: new Set(),
};

const MAX_LOG_LINES = 2000;
const PYTHON = process.env.PYTHON_PATH || "python"; // en Windows podés usar "py"
const BOT_SCRIPT = process.env.BOT_SCRIPT_PATH || path.resolve(process.cwd(), "1.py");

function pushLog(line: string) {
  const l = line.endsWith("\n") ? line : line + "\n";
  state.logs.push(l);
  if (state.logs.length > MAX_LOG_LINES) {
    state.logs.splice(0, state.logs.length - MAX_LOG_LINES);
  }
  for (const cb of state.listeners) {
    try { cb(l); } catch {}
  }
}

export function subscribeLogs(cb: (line: string) => void) {
  state.listeners.add(cb);
  return () => state.listeners.delete(cb);
}

export function getBufferedLogs(): string[] {
  return [...state.logs];
}

export function isRunning() {
  return !!state.proc && !state.proc.killed;
}

export function getStatus() {
  return {
    running: isRunning(),
    pid: state.proc?.pid ?? null,
    startedAt: state.startedAt,
    script: BOT_SCRIPT,
  };
}

export async function startBot(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isRunning()) return { ok: false, error: "Bot ya está en ejecución" };

  try {
    // lib/bot-runner.ts (dentro de startBot)
    const proc = spawn(PYTHON, ["-u", "-X", "utf8", BOT_SCRIPT], {  // 👈 -u y -X utf8
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PYTHONIOENCODING: "utf-8",          // 👈 fuerza stdout/stderr UTF-8
    },
    });

    state.proc = proc;
    state.startedAt = Date.now();
    pushLog(`\n>>> BOT STARTED (pid=${proc.pid}) at ${new Date(state.startedAt).toISOString()}\n`);

    proc.stdout.on("data", (chunk) => pushLog(chunk.toString()));
    proc.stderr.on("data", (chunk) => pushLog(chunk.toString()));

    proc.on("exit", (code, sig) => {
      pushLog(`\n>>> BOT EXITED (code=${code}, signal=${sig ?? ""})\n`);
      state.proc = null;
      state.startedAt = null;
    });

    return { ok: true };
  } catch (e: any) {
    state.proc = null;
    state.startedAt = null;
    pushLog(`\n>>> START ERROR: ${e?.message || e}\n`);
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function stopBot(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isRunning()) return { ok: false, error: "Bot no está corriendo" };
  try {
    // cierre suave primero
    state.proc!.kill("SIGINT");
    pushLog("\n>>> SENDING SIGINT TO BOT...\n");

    // fallback kill duro si no termina
    setTimeout(() => {
      if (isRunning()) {
        try { state.proc!.kill("SIGKILL"); } catch {}
      }
    }, 4000);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// components/bot-console.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Status = {
  running: boolean;
  pid: number | null;
  startedAt: number | null;
  script: string;
};

export default function BotConsole({ botRunning }: { botRunning?: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [logs, setLogs] = useState<string>("");
  const termRef = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      const r = await fetch("/api/bot/status", { cache: "no-store" });
      setStatus(await r.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    setConnecting(true);
    const es = new EventSource("/api/bot/logs");
    es.onmessage = (ev) => {
      try {
        const chunk = JSON.parse(ev.data) as string;
        setLogs((prev) => prev + chunk);
      } catch {}
    };
    es.onerror = () => {
      setConnecting(false);
      es.close();
    };
    es.onopen = () => setConnecting(false);
    return () => es.close();
  }, []);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [logs]);

  // const start = async () => {
  //   await fetch("/api/bot/start", { method: "POST" });
  //   fetchStatus();
  // };
  const stop = async () => {
    await fetch("/api/bot/stop", { method: "POST" });
    setTimeout(fetchStatus, 600);
  };

  const startedAtText = useMemo(() => {
    if (!status?.startedAt) return "-";
    return new Date(status.startedAt).toLocaleString();
  }, [status]);

  return (
    <section className="py-6">
      <div className="glass-surface rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-1">
            <div className="text-white font-mono">
              Estado:{" "}
              <span className={status?.running ? "text-green-400" : "text-red-400"}>
                {status?.running ? "RUNNING" : "STOPPED"}
              </span>
            </div>
            <div className="text-gray-300 font-mono text-sm">PID: {status?.pid ?? "-"}</div>
            <div className="text-gray-300 font-mono text-sm">Start: {startedAtText}</div>
          </div>

          <div className="flex gap-2">
            <Button
              // onClick={start}
              disabled={status?.running}
              className="bg-green-600/30 hover:bg-green-600/40 border border-green-500/30"
            >
              Start Bot
            </Button>
            <Button
              onClick={stop}
              disabled={!status?.running}
              className="bg-red-600/30 hover:bg-red-600/40 border border-red-500/30"
            >
              Stop Bot
            </Button>
          </div>
        </div>

        <div className="text-gray-300 font-mono text-xs mb-2">
          {connecting ? "Conectando logs..." : "Logs en vivo"}
        </div>

        <div
          ref={termRef}
          className="bg-black/70 text-green-300 font-mono text-sm p-3 rounded-md border border-white/10 max-h-[50vh] overflow-y-auto whitespace-pre-wrap"
        >
          {logs || "— sin logs aún —"}
        </div>
      </div>
    </section>
  );
}

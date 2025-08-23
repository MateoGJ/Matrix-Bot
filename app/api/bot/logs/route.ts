import { getBufferedLogs, subscribeLogs } from "@/lib/bot-runner";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // enviar buffer inicial
      const buf = getBufferedLogs().join("");
      if (buf) controller.enqueue(encoder.encode(`data: ${JSON.stringify(buf)}\n\n`));

      const unsubscribe = subscribeLogs((line) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(line)}\n\n`));
      });

      // cleanup si se corta
      // @ts-ignore
      controller.signal?.addEventListener?.("abort", unsubscribe);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

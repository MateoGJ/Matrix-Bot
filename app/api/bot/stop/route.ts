import { stopBot } from "@/lib/bot-runner";

export const runtime = "nodejs";

export async function POST() {
  const res = await stopBot();
  return new Response(JSON.stringify(res), {
    status: res.ok ? 200 : 400,
    headers: { "Content-Type": "application/json" },
  });
}

import { getStatus } from "@/lib/bot-runner";

export const runtime = "nodejs";

export async function GET() {
  const status = getStatus();
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

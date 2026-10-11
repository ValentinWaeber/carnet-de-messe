import { connection } from "next/server";
import { getCatalog } from "@/lib/server/templates";
export async function GET() {
  await connection();
  return Response.json(
    { templates: getCatalog() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { account } from "@/lib/server/auth";
export async function GET(request: Request) {
  try {
    return Response.json(
      { user: await account(request.headers) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Le service de connexion est indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

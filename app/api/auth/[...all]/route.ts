import { getAuth } from "@/lib/server/auth";
import { connection } from "next/server";
import { HttpError, limitedJson } from "@/lib/server/http";

async function handler(request: Request) {
  try {
    await connection();
    if (request.method === "POST") {
      const body = await limitedJson(request, 32 * 1024);
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new HttpError("Les données sont invalides.", 400);
      if (
        new URL(request.url).pathname.endsWith("/sign-up/email") &&
        (typeof body.name !== "string" ||
          !body.name.trim() ||
          body.name.length > 80)
      )
        throw new HttpError(
          "Indiquez un prénom de 80 caractères maximum.",
          400,
        );
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(body),
      });
    }
    return await (await getAuth()).handler(request);
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json(
        { code: "INVALID_REQUEST", message: error.message },
        { status: error.status },
      );
    console.error(
      "Authentification indisponible",
      error instanceof Error ? error.message : "Erreur serveur",
    );
    return Response.json(
      {
        code: "SERVICE_UNAVAILABLE",
        message:
          "Le service de connexion est indisponible. Réessayez dans un instant.",
      },
      { status: 503 },
    );
  }
}
export const GET = handler;
export const POST = handler;

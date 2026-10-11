import "server-only";
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const expected = new URL(
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ).origin;
  if (
    request.headers.get("origin") !== expected ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    throw new HttpError("Cette requête n’est pas autorisée.", 403);
}
export async function limitedJson(request: Request, max = 32 * 1024 * 1024) {
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError("Le modèle est trop volumineux.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError("Le modèle est absent.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) {
        await reader.cancel();
        throw new HttpError("Le modèle est trop volumineux.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Les données du modèle sont invalides.", 400);
  } finally {
    reader.releaseLock();
  }
}
export function apiError(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "Impossible d’enregistrer le modèle. Réessayez dans un instant.",
    },
    { status: error instanceof HttpError ? error.status : 500 },
  );
}

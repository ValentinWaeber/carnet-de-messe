import { z } from "zod";
import { publicationSchema } from "@/lib/catalog";
import { account } from "@/lib/server/auth";
import {
  getTemplate,
  publishTemplate,
  resetTemplate,
} from "@/lib/server/templates";
import {
  sameOrigin,
  limitedJson,
  HttpError,
  apiError,
} from "@/lib/server/http";

async function authorize(request: Request) {
  const user = await account(request.headers);
  if (!user) throw new HttpError("Connectez-vous pour continuer.", 401);
  if (!user.admin)
    throw new HttpError("Cet espace est réservé à l’administrateur.", 403);
  sameOrigin(request);
  return user;
}
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await authorize(request);
    const { id } = await context.params;
    if (!getTemplate(id)) throw new HttpError("Ce modèle n’existe pas.", 404);
    const parsed = publicationSchema.safeParse(await limitedJson(request));
    if (!parsed.success)
      throw new HttpError(
        "Vérifiez le nom, la description, les pages et les images du modèle.",
        400,
      );
    let saved: boolean;
    try {
      saved = publishTemplate(id, parsed.data, user.id);
    } catch (error) {
      throw new HttpError(
        error instanceof Error ? error.message : "Les images sont invalides.",
        400,
      );
    }
    if (!saved)
      throw new HttpError(
        "Ce modèle a changé depuis l’ouverture du brouillon. Rechargez la version publiée avant de recommencer.",
        409,
      );
    return Response.json({ revision: getTemplate(id)!.revision });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await authorize(request);
    const { id } = await context.params;
    if (!getTemplate(id)) throw new HttpError("Ce modèle n’existe pas.", 404);
    const parsed = z
      .object({ revision: z.number().int().positive() })
      .strict()
      .safeParse(await limitedJson(request, 1024));
    if (!parsed.success)
      throw new HttpError("La version du modèle est invalide.", 400);
    if (!resetTemplate(id, parsed.data.revision, user.id))
      throw new HttpError(
        "Ce modèle a changé. Rechargez la collection avant de recommencer.",
        409,
      );
    return Response.json({ revision: getTemplate(id)!.revision });
  } catch (error) {
    return apiError(error);
  }
}

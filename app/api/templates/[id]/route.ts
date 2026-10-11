import { getTemplate } from "@/lib/server/templates";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const template = getTemplate(id);
  return Response.json(template || { error: "Ce modèle n’existe pas." }, {
    status: template ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}

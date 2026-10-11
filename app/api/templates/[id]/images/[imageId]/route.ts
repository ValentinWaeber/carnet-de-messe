import { getTemplate } from "@/lib/server/templates";
import { templateImageBytes } from "@/lib/catalog";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await context.params;
  const image = getTemplate(id)?.images.find((image) => image.id === imageId);
  if (!image) return new Response(null, { status: 404 });
  return new Response(templateImageBytes(image), {
    headers: {
      "Content-Type": image.mime,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
}

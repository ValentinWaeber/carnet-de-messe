import { z } from "zod";
import {
  documentSchema,
  assetIds,
  resizeDocument,
  uid,
  type BookDocument,
  type AssetSources,
  type ImageAsset,
} from "./document";
import { detectedMime, MAX_IMAGE_BYTES } from "./images";

export const templateMetadataSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(300),
    category: z.enum(["Intemporels", "Nature", "Modernes"]),
  })
  .strict();
export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;
export const templateImageSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .max(100),
    name: z.string().max(200),
    mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
    width: z.number().int().positive().max(10000),
    height: z.number().int().positive().max(10000),
    data: z.string().max(12 * 1024 * 1024),
  })
  .strict();
export type TemplateImage = z.infer<typeof templateImageSchema>;
export const publicationSchema = z
  .object({
    metadata: templateMetadataSchema,
    document: documentSchema,
    images: z.array(templateImageSchema).max(30),
    revision: z.number().int().positive(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const wanted = assetIds(value.document);
    const ids = value.images.map((image) => image.id);
    if (
      new Set(ids).size !== ids.length ||
      wanted.length !== ids.length ||
      wanted.some((id) => !ids.includes(id))
    )
      ctx.addIssue({
        code: "custom",
        message: "Les images doivent correspondre exactement au modèle.",
      });
    if (value.images.some((image) => image.width * image.height > 40000000))
      ctx.addIssue({
        code: "custom",
        message: "Une image dépasse 40 mégapixels.",
      });
  });
export type TemplateBundle = TemplateMetadata & {
  id: string;
  document: BookDocument;
  images: TemplateImage[];
  revision: number;
  updatedAt: string;
};
export type CatalogEntry = Omit<TemplateBundle, "images"> & {
  sources: AssetSources;
};

// Shared by server validation and browser hydration. No remote image URLs or SVG.
export function templateImageBytes(image: TemplateImage) {
  const prefix = `data:${image.mime};base64,`;
  if (!image.data.startsWith(prefix))
    throw new Error("Le format de l’image est invalide.");
  const base64 = image.data.slice(prefix.length);
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      base64,
    )
  )
    throw new Error("L’image est invalide.");
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  if (
    !bytes.length ||
    bytes.length > MAX_IMAGE_BYTES ||
    detectedMime(bytes) !== image.mime
  )
    throw new Error("Importez une image PNG, JPEG ou WebP de 8 Mo maximum.");
  return bytes;
}
export function instantiateTemplate(
  bundle: TemplateBundle,
  format = bundle.document.format,
  draftId?: string,
) {
  const now = new Date().toISOString();
  const mapping = new Map(bundle.images.map((image) => [image.id, uid()]));
  const document = structuredClone(bundle.document);
  document.id = draftId || uid();
  document.createdAt = now;
  document.updatedAt = now;
  document.pages = document.pages.map((page) => ({
    ...page,
    id: uid(),
    blocks: page.blocks.map((block) => ({
      ...block,
      id: uid(),
      ...(block.assetId ? { assetId: mapping.get(block.assetId) } : {}),
    })),
  }));
  const images: ImageAsset[] = bundle.images.map((image) => ({
    id: mapping.get(image.id)!,
    name: image.name,
    mime: image.mime,
    width: image.width,
    height: image.height,
    blob: new Blob([templateImageBytes(image)], { type: image.mime }),
  }));
  return {
    doc: resizeDocument(documentSchema.parse(document), format),
    images,
  };
}

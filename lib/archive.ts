import { unzipSync, zip, strFromU8, strToU8 } from "fflate";
import { z } from "zod";
import {
  assetIds,
  documentSchema,
  uid,
  type BookDocument,
  type ImageAsset,
} from "./document";
import { validateImage } from "./images";
import { getImages } from "./storage";
export { safeFilename } from "./filename";

const metadataSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .max(100),
    name: z.string().max(200),
    mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
    width: z.number().int().positive().max(10000),
    height: z.number().int().positive().max(10000),
    path: z.string().regex(/^images\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/),
  })
  .strict();
const manifestSchema = z
  .object({
    kind: z.literal("maison-du-carnet"),
    version: z.literal(1),
    document: documentSchema,
    images: z.array(metadataSchema).max(30),
  })
  .strict();
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function exportArchive(doc: BookDocument): Promise<Blob> {
  const images = await getImages(doc),
    files: Record<string, Uint8Array> = {};
  const imageBytes = images.reduce((sum, image) => sum + image.blob.size, 0);
  if (images.length > 30 || imageBytes > 60 * 1024 * 1024)
    throw new Error(
      "Ce projet dépasse les limites d’une archive réimportable (30 images et 60 Mo). Réduisez la taille des images.",
    );
  const metadata = await Promise.all(
    images.map(async (image) => {
      const path = `images/${image.id}.${{ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[image.mime]}`;
      files[path] = new Uint8Array(await image.blob.arrayBuffer());
      return {
        id: image.id,
        name: image.name,
        mime: image.mime,
        width: image.width,
        height: image.height,
        path,
      };
    }),
  );
  files["manifest.json"] = strToU8(
    JSON.stringify({
      kind: "maison-du-carnet",
      version: 1,
      document: doc,
      images: metadata,
    }),
  );
  if (
    files["manifest.json"].length > 8 * 1024 * 1024 ||
    imageBytes + files["manifest.json"].length > 60 * 1024 * 1024
  )
    throw new Error(
      "Le document ou ses images dépassent les limites d’export (8 Mo de texte et 60 Mo au total).",
    );
  return new Promise((resolve, reject) =>
    zip(files, { level: 6 }, (err, bytes) =>
      err
        ? reject(err)
        : bytes.length > 40 * 1024 * 1024
          ? reject(
              new Error(
                "L’archive dépasse 40 Mo. Réduisez la taille des images avant de l’exporter.",
              ),
            )
          : resolve(
              new Blob([new Uint8Array(bytes)], { type: "application/zip" }),
            ),
    ),
  );
}
export async function importArchive(
  file: File,
): Promise<{ doc: BookDocument; images: ImageAsset[] }> {
  if (file.size > 40 * 1024 * 1024)
    throw new Error("L’archive dépasse la limite de 40 Mo.");
  let total = 0,
    count = 0;
  let files: ReturnType<typeof unzipSync>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (entry) => {
        total += entry.originalSize;
        count++;
        if (
          total > 60 * 1024 * 1024 ||
          count > 31 ||
          entry.originalSize > 8 * 1024 * 1024
        )
          throw new Error("Archive trop volumineuse une fois décompressée.");
        return (
          entry.name === "manifest.json" ||
          /^images\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(entry.name)
        );
      },
    });
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Archive invalide : ${e.message}`
        : "Archive ZIP invalide.",
    );
  }
  if (!files["manifest.json"])
    throw new Error("Le manifeste du projet est introuvable.");
  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(files["manifest.json"]));
  } catch {
    throw new Error("Le manifeste JSON est illisible.");
  }
  const result = manifestSchema.safeParse(manifest);
  if (!result.success)
    throw new Error(
      "Le manifeste est invalide ou sa version n’est pas prise en charge.",
    );
  const { document: doc, images: metadata } = result.data;
  if (
    new Set(metadata.map((i) => i.id)).size !== metadata.length ||
    assetIds(doc).some((id) => !metadata.some((i) => i.id === id))
  )
    throw new Error("Les références aux images sont incohérentes.");
  const map = new Map(metadata.map((i) => [i.id, uid()]));
  const images = await Promise.all(
    metadata.map(async (m) => {
      if (!files[m.path]) throw new Error(`Image manquante : ${m.name}`);
      const blob = new Blob([new Uint8Array(files[m.path])], { type: m.mime });
      const info = await validateImage(blob);
      return { id: map.get(m.id)!, name: m.name, blob, ...info };
    }),
  );
  // Imported projects never overwrite an existing project or its image records.
  const now = new Date().toISOString();
  return {
    doc: {
      ...doc,
      id: uid(),
      createdAt: now,
      updatedAt: now,
      pages: doc.pages.map((p) => ({
        ...p,
        blocks: p.blocks.map((b) => ({
          ...b,
          ...(b.assetId ? { assetId: map.get(b.assetId)! } : {}),
        })),
      })),
    },
    images,
  };
}

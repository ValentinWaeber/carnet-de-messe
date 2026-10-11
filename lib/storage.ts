import { openDB, type DBSchema } from "idb";
import {
  assetIds,
  documentSchema,
  duplicatePage,
  uid,
  type BookDocument,
  type ImageAsset,
  type AssetSources,
} from "./document";

interface CarnetDB extends DBSchema {
  projects: { key: string; value: BookDocument };
  images: { key: string; value: ImageAsset };
}
const db = () =>
  openDB<CarnetDB>("maison-du-carnet", 1, {
    upgrade(database) {
      database.createObjectStore("projects", { keyPath: "id" });
      database.createObjectStore("images", { keyPath: "id" });
    },
  });
export async function listProjects() {
  return (await (await db()).getAll("projects"))
    .filter((doc) => !doc.id.startsWith("admin-"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function loadProject(id: string) {
  const doc = await (await db()).get("projects", id);
  return doc ? documentSchema.parse(doc) : undefined;
}
export async function saveProject(doc: BookDocument) {
  await (await db()).put("projects", documentSchema.parse(doc));
}
export async function saveImage(image: ImageAsset) {
  await (await db()).put("images", image);
}
export async function getImages(doc: BookDocument) {
  const database = await db();
  const images = await Promise.all(
    assetIds(doc).map((id) => database.get("images", id)),
  );
  if (images.some((i) => !i))
    throw new Error(
      "Une image du carnet manque sur cet appareil. Réimportez le projet complet.",
    );
  return images as ImageAsset[];
}
export async function saveBundle(doc: BookDocument, images: ImageAsset[]) {
  const database = await db();
  const tx = database.transaction(["projects", "images"], "readwrite");
  await Promise.all([
    tx.objectStore("projects").put(documentSchema.parse(doc)),
    ...images.map((i) => tx.objectStore("images").put(i)),
  ]);
  await tx.done;
}
export async function deleteProject(id: string) {
  const database = await db();
  const tx = database.transaction(["projects", "images"], "readwrite");
  await tx.objectStore("projects").delete(id);
  const referenced = new Set(
    (await tx.objectStore("projects").getAll()).flatMap(assetIds),
  );
  for (const key of await tx.objectStore("images").getAllKeys())
    if (!referenced.has(key)) await tx.objectStore("images").delete(key);
  await tx.done;
}
export function cloneDocument(doc: BookDocument): BookDocument {
  const now = new Date().toISOString();
  return {
    ...structuredClone(doc),
    id: uid(),
    title: `${doc.title.slice(0, 135)} (copie)`,
    createdAt: now,
    updatedAt: now,
    pages: doc.pages.map(duplicatePage),
  };
}
export const blobDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire l’image."));
    reader.readAsDataURL(blob);
  });
export async function imageSources(
  images: ImageAsset[],
): Promise<AssetSources> {
  return Object.fromEntries(
    await Promise.all(
      images.map(async (i) => [i.id, await blobDataUrl(i.blob)]),
    ),
  );
}
export const storageError = (error: unknown) =>
  error instanceof DOMException && error.name === "QuotaExceededError"
    ? "Le stockage de cet appareil est plein. Exportez votre projet, puis libérez de l’espace."
    : error instanceof Error
      ? error.message
      : "Le stockage local est indisponible. Vérifiez les autorisations du navigateur.";

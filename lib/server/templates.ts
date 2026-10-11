import "server-only";
import { database } from "./database";
import { templates, createTemplateDocument } from "../templates";
import {
  templateImageBytes,
  type TemplateBundle,
  type CatalogEntry,
} from "../catalog";

type TemplateRow = {
  id: string;
  metadata: string;
  document: string;
  assets: string;
  revision: number;
  updated_at: string;
};
export function seedTemplates() {
  const db = database();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO templates (id, metadata, document, updated_at) VALUES (?, ?, ?, ?)",
  );
  for (const template of templates) {
    if (db.prepare("SELECT id FROM templates WHERE id = ?").get(template.id))
      continue;
    const { name, description, category } = template;
    const document = createTemplateDocument(template.id);
    insert.run(
      template.id,
      JSON.stringify({ name, description, category }),
      JSON.stringify(document),
      document.updatedAt,
    );
  }
}
function bundle(row: TemplateRow): TemplateBundle {
  return {
    id: row.id,
    ...JSON.parse(row.metadata),
    document: JSON.parse(row.document),
    images: JSON.parse(row.assets),
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}
export function getTemplate(id: string) {
  seedTemplates();
  const row = database()
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(id) as TemplateRow | undefined;
  return row ? bundle(row) : null;
}
export function getCatalog(): CatalogEntry[] {
  seedTemplates();
  const select = database().prepare("SELECT * FROM templates WHERE id = ?");
  return templates.map((original) => {
    const { images, ...entry } = bundle(select.get(original.id) as TemplateRow);
    return {
      ...entry,
      sources: Object.fromEntries(
        images.map((image) => [
          image.id,
          `/api/templates/${entry.id}/images/${image.id}?v=${entry.revision}`,
        ]),
      ),
    };
  });
}
export function publishTemplate(
  id: string,
  input: {
    metadata: unknown;
    document: unknown;
    images: TemplateBundle["images"];
    revision: number;
  },
  userId: string,
) {
  let total = 0;
  for (const image of input.images)
    total += templateImageBytes(image).byteLength;
  if (total > 20 * 1024 * 1024)
    throw new Error("Les images du modèle dépassent 20 Mo au total.");
  return (
    database()
      .prepare(
        "UPDATE templates SET metadata = ?, document = ?, assets = ?, revision = revision + 1, updated_at = ?, updated_by = ? WHERE id = ? AND revision = ?",
      )
      .run(
        JSON.stringify(input.metadata),
        JSON.stringify(input.document),
        JSON.stringify(input.images),
        new Date().toISOString(),
        userId,
        id,
        input.revision,
      ).changes > 0
  );
}
export function resetTemplate(id: string, revision: number, userId: string) {
  const original = templates.find((template) => template.id === id);
  if (!original) return false;
  const { name, description, category } = original;
  return publishTemplate(
    id,
    {
      metadata: { name, description, category },
      document: createTemplateDocument(id),
      images: [],
      revision,
    },
    userId,
  );
}

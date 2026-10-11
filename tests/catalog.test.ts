import test from "node:test";
import assert from "node:assert/strict";
import { createTemplateDocument } from "../lib/templates";
import { documentSchema, createBlock } from "../lib/document";
import {
  instantiateTemplate,
  publicationSchema,
  templateImageBytes,
  type TemplateBundle,
} from "../lib/catalog";

const original: TemplateBundle = {
  id: "classique-ivoire",
  name: "Ivoire",
  description: "Un beau modèle",
  category: "Intemporels",
  document: createTemplateDocument("classique-ivoire"),
  images: [],
  revision: 1,
  updatedAt: new Date().toISOString(),
};
test("chaque nouveau carnet reste indépendant du modèle publié et des autres carnets", () => {
  const first = instantiateTemplate(original, { width: 210, height: 297 });
  const second = instantiateTemplate(original);
  assert.notEqual(first.doc.id, second.doc.id);
  assert.notEqual(first.doc.pages[0].id, second.doc.pages[0].id);
  assert.notEqual(
    first.doc.pages[0].blocks[0].id,
    original.document.pages[0].blocks[0].id,
  );
  first.doc.pages[0].background = "#ff0000";
  assert.notEqual(original.document.pages[0].background, "#ff0000");
  assert.equal(first.doc.format.width, 210);
  assert.ok(documentSchema.safeParse(first.doc).success);
});
test("les images copiées sont réidentifiées et ne partagent pas les ressources d’un brouillon", () => {
  const doc = structuredClone(original.document);
  doc.pages[0].blocks.push({ ...createBlock("image"), assetId: "photo" });
  const image = {
    id: "photo",
    name: "photo.png",
    mime: "image/png" as const,
    width: 1,
    height: 1,
    data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1cAAAAASUVORK5CYII=",
  };
  const { doc: copy, images } = instantiateTemplate({
    ...original,
    document: doc,
    images: [image],
  });
  assert.notEqual(images[0].id, image.id);
  assert.equal(copy.pages[0].blocks.at(-1)!.assetId, images[0].id);
  assert.ok(images[0].blob.size > 0);
  assert.throws(() =>
    templateImageBytes({ ...image, data: "https://example.com/photo.png" }),
  );
  assert.throws(() =>
    templateImageBytes({
      ...image,
      data: "data:image/png;base64,PHN2Zz48L3N2Zz4=",
    }),
  );
});
test("une publication refuse les images absentes, surnuméraires et le HTML arbitraire", () => {
  const metadata = {
    name: original.name,
    description: original.description,
    category: original.category,
  };
  assert.ok(
    publicationSchema.safeParse({
      metadata,
      document: original.document,
      images: [],
      revision: 1,
    }).success,
  );
  const document = structuredClone(original.document);
  document.pages[0].blocks.push({
    ...createBlock("image"),
    assetId: "missing",
  });
  assert.equal(
    publicationSchema.safeParse({ metadata, document, images: [], revision: 1 })
      .success,
    false,
  );
  assert.equal(
    publicationSchema.safeParse({
      metadata,
      document: { html: "<script>alert(1)</script>" },
      images: [],
      revision: 1,
    }).success,
    false,
  );
  assert.equal(
    publicationSchema.safeParse({
      metadata: { ...metadata, role: "admin" },
      document: original.document,
      images: [],
      revision: 1,
    }).success,
    false,
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mmToPx,
  pxToMm,
  mmToPt,
  ptToMm,
  documentSchema,
  duplicatePage,
  resizeDocument,
  boundsOverflow,
  createBlock,
  richText,
} from "../lib/document";
import {
  templates,
  createBlankDocument,
  createTemplateDocument,
} from "../lib/templates";
import { commit, undo, redo } from "../lib/history";
import { printHtml, renderText } from "../lib/render";
import { detectedMime, imageDpi } from "../lib/images";

test("les conversions physiques restent réversibles", () => {
  for (const mm of [0, 1, 14, 148, 210, 297]) {
    assert.ok(Math.abs(pxToMm(mmToPx(mm)) - mm) < 1e-10);
    assert.ok(Math.abs(ptToMm(mmToPt(mm)) - mm) < 1e-10);
  }
  assert.equal(mmToPx(25.4), 96);
  assert.equal(mmToPt(25.4), 72);
});
test("les quinze modèles sont valides, différents et indépendants", () => {
  assert.equal(templates.length, 15);
  assert.equal(new Set(templates.map((t) => t.id)).size, 15);
  const renders = new Set<string>();
  const compositions = new Set<string>();
  for (const t of templates) {
    const doc = createTemplateDocument(t.id);
    assert.equal(documentSchema.safeParse(doc).success, true, t.name);
    assert.equal(doc.pages.length, 8);
    renders.add(printHtml(doc, {}).replace(/<title>.*?<\/title>/, ""));
    compositions.add(
      JSON.stringify(
        doc.pages[0].blocks.map((block) => ({
          type: block.type,
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
          content: block.content,
          ornament: block.ornament,
          style: { ...block.style, color: "#000000" },
        })),
      ),
    );
    const second = createTemplateDocument(t.id);
    doc.pages[0].blocks[0].x = 999;
    assert.notEqual(second.pages[0].blocks[0].x, 999);
  }
  assert.equal(renders.size, 15);
  assert.equal(
    compositions.size,
    15,
    "Les couvertures doivent différer autrement que par leur couleur.",
  );
});
test("les identifiants dupliqués et les propriétés arbitraires sont rejetés", () => {
  const doc = createBlankDocument();
  doc.pages[1].id = doc.pages[0].id;
  assert.equal(documentSchema.safeParse(doc).success, false);
  assert.equal(
    documentSchema.safeParse({
      ...createBlankDocument(),
      html: "<script>bad()</script>",
    }).success,
    false,
  );
  const bad = createBlankDocument();
  bad.format.width = 0;
  assert.equal(documentSchema.safeParse(bad).success, false);
});
test("la duplication des pages préserve le contenu et renouvelle tous les identifiants", () => {
  const doc = createTemplateDocument("botanique"),
    original = doc.pages[0],
    copy = duplicatePage(original);
  assert.notEqual(copy.id, original.id);
  assert.deepEqual(
    copy.blocks.map((b) => b.content),
    original.blocks.map((b) => b.content),
  );
  assert.ok(copy.blocks.every((b, i) => b.id !== original.blocks[i].id));
});
test("changer de format conserve les proportions sans mutation", () => {
  const doc = createTemplateDocument("classique-ivoire"),
    before = structuredClone(doc),
    resized = resizeDocument(doc, { width: 210, height: 297 });
  const scale = 297 / 210;
  assert.equal(
    resized.pages[0].blocks[0].x,
    before.pages[0].blocks[0].x * scale,
  );
  assert.equal(
    resized.pages[0].blocks[0].style.fontSize,
    before.pages[0].blocks[0].style.fontSize * scale,
  );
  assert.deepEqual(doc, before);
  assert.ok(documentSchema.safeParse(resized).success);
});
test("l’historique annule et rétablit une opération complète", () => {
  const doc = createBlankDocument(),
    next = { ...doc, pages: [...doc.pages, duplicatePage(doc.pages[1])] };
  const h = commit({ past: [], present: doc, future: [] }, next);
  assert.equal(h.past.length, 1);
  assert.equal(undo(h).present.pages.length, 4);
  assert.equal(redo(undo(h)).present.pages.length, 5);
  assert.equal(
    commit(undo(h), { ...doc, title: "Autre nom" }).future.length,
    0,
  );
});
test("les débordements prennent aussi en compte la rotation", () => {
  const b = createBlock("paragraph");
  b.x = 0;
  b.y = 0;
  assert.equal(boundsOverflow(b, { width: 148, height: 210 }), false);
  b.rotation = 45;
  assert.equal(boundsOverflow(b, { width: 148, height: 210 }), true);
});
test("le rendu échappe le texte et ne contient aucune commande d’édition", () => {
  const text = renderText(richText('<script>alert("x")</script>'));
  assert.ok(!text.includes("<script>"));
  assert.ok(text.includes("&lt;script&gt;"));
  const doc = createBlankDocument();
  doc.pages[0].blocks.push({
    ...createBlock("paragraph"),
    content: richText("Texte sélectionnable"),
  });
  const html = printHtml(doc, {});
  assert.ok(html.includes("Texte sélectionnable"));
  assert.ok(html.includes("size:148mm 210mm"));
  assert.ok(!html.includes("<button"));
  assert.ok(!html.includes("moveable"));
});
test("les signatures d’images et la définition d’impression sont contrôlées", () => {
  assert.equal(
    detectedMime(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(
    detectedMime(new TextEncoder().encode("<svg></svg>")),
    undefined,
  );
  assert.equal(imageDpi(300, 25.4), 300);
});

import { test, expect, type Page } from "@playwright/test";
import { PDFDocument, PDFName } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import type { BookDocument } from "../../lib/document";
import { templates, createTemplateDocument } from "../../lib/templates";
import { printHtml } from "../../lib/render";

async function stored(page: Page): Promise<BookDocument> {
  return page.evaluate(
    async () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("maison-du-carnet", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db
            .transaction("projects")
            .objectStore("projects")
            .getAll();
          req.onsuccess = () => {
            db.close();
            resolve(
              req.result.sort(
                (a: { updatedAt: string }, b: { updatedAt: string }) =>
                  b.updatedAt.localeCompare(a.updatedAt),
              )[0],
            );
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );
}
async function saved(page: Page) {
  await expect(page.locator(".save-status")).toContainText("Enregistré");
}
async function download(page: Page, label: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: label }).click();
  const result = await pending;
  expect(await result.failure()).toBeNull();
  return {
    bytes: await readFile((await result.path())!),
    path: (await result.path())!,
  };
}

test("tranche complète : création, édition, zoom, images, pages, sauvegarde, aperçu, ZIP et PDF", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Votre histoire",
  );
  expect(await page.locator(".template-card").count()).toBe(15);
  await page.screenshot({
    path: testInfo.outputPath("accueil-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Partir d’une page blanche" }).click();
  await page.getByRole("button", { name: "Ouvrir mon carnet" }).click();
  await expect(page).toHaveURL(/\/atelier\//);
  await saved(page);
  await page.getByRole("button", { name: "Éléments", exact: true }).click();
  await page.locator(".library-item").filter({ hasText: "Titre" }).click();
  await page
    .getByRole("button", { name: "Modifier le texte", exact: true })
    .click();
  await page.locator(".tiptap").fill("Camille & Gabriel");
  await page.getByRole("button", { name: "Appliquer le texte" }).click();
  await expect(
    page.locator(".editor-shell:visible .editable-document"),
  ).toContainText("Camille & Gabriel");
  await saved(page);
  for (const zoom of [50, 100, 150]) {
    await page.getByLabel("Zoom du carnet").selectOption(String(zoom));
    const element = page.locator(".editable-document [data-block-id]").first();
    await element.click();
    const before = await stored(page),
      b = before.pages[0].blocks[0],
      rect = await element.boundingBox();
    expect(rect).not.toBeNull();
    const pxPerMm = rect!.width / b.width;
    await page.mouse.move(
      rect!.x + rect!.width / 2,
      rect!.y + rect!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      rect!.x + rect!.width / 2 + pxPerMm * 7,
      rect!.y + rect!.height / 2 + pxPerMm * 5,
      { steps: 10 },
    );
    await page.mouse.up();
    await saved(page);
    await expect
      .poll(async () => {
        const d = await stored(page);
        return Math.abs(d.pages[0].blocks[0].x - (b.x + 7));
      })
      .toBeLessThan(1.5);
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await saved(page);
    await expect
      .poll(async () =>
        Math.abs((await stored(page)).pages[0].blocks[0].x - b.x),
      )
      .toBeLessThan(0.1);
    await page.getByRole("button", { name: "Rétablir", exact: true }).click();
    await saved(page);
  }
  await page.getByLabel("Zoom du carnet").selectOption("100");
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 600;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#889b70";
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = "#f8f5eb";
    ctx.fillRect(120, 100, 560, 400);
    return c.toDataURL("image/png").split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await page
    .locator(".library-item")
    .filter({ hasText: "Un souvenir en image" })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "souvenir.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  });
  await expect(
    page.locator(".editor-shell:visible .editable-document img"),
  ).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(
    page.locator(".editor-shell:visible .editable-document img"),
  ).toBeVisible();
  await expect(
    page.locator(".editor-shell:visible .editable-document"),
  ).toContainText("Camille & Gabriel");
  await saved(page);
  await page
    .getByRole("button", { name: "Ajouter une page", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dupliquer la page", exact: true })
    .click();
  await saved(page);
  const beforeOrder = await stored(page);
  expect(beforeOrder.pages.length).toBe(6);
  await page
    .getByRole("button", { name: "Monter la page", exact: true })
    .click();
  await saved(page);
  const afterOrder = await stored(page);
  expect(afterOrder.pages[1].id).toBe(beforeOrder.pages[2].id);
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  await expect(page.locator(".flip-host .flip-page").first()).toBeAttached();
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(page.locator(".preview-controls")).toContainText("Page");
  await page.screenshot({ path: testInfo.outputPath("apercu-desktop.png") });
  await page.getByRole("button", { name: "Fermer l’aperçu" }).click();
  await page
    .getByRole("button", {
      name: "Page 1, première de couverture",
      exact: true,
    })
    .click();
  await page.screenshot({ path: testInfo.outputPath("atelier-desktop.png") });
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  const archive = await download(page, "Exporter le projet éditable");
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  const pdfFile = await download(page, "Télécharger le PDF");
  const pdf = await PDFDocument.load(pdfFile.bytes);
  expect(pdf.getPageCount()).toBe(6);
  expect(pdf.getPage(0).getWidth()).toBeCloseTo((148 * 72) / 25.4, 0);
  expect(pdf.getPage(0).getHeight()).toBeCloseTo((210 * 72) / 25.4, 0);
  expect(pdfFile.bytes.toString("latin1")).toContain("/Subtype /Image");
  const contents = pdf.getPage(0).node.Contents();
  expect(contents).toBeTruthy();
  const text = pdfFile.bytes.toString("latin1");
  expect(text).toContain("/Font");
  let hasTextOperator = false;
  for (const match of text.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      if (
        /\bT[jJ]\b/.test(
          inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"),
        )
      )
        hasTextOperator = true;
    } catch {}
  }
  expect(hasTextOperator).toBe(true);
  expect(pdf.getPage(0).node.Resources()?.get(PDFName.of("Font"))).toBeTruthy();
  await page.getByRole("button", { name: "Retour aux carnets" }).click();
  await expect(page).toHaveURL(/\/#projets/);
  const importChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importer un projet" }).click();
  await (
    await importChooser
  ).setFiles({
    name: "copie.carnet.zip",
    mimeType: "application/zip",
    buffer: archive.bytes,
  });
  await expect(page).toHaveURL(/\/atelier\//);
  await expect(
    page.locator(".editor-shell:visible .editable-document img"),
  ).toBeVisible();
  await expect(
    page.locator(".editor-shell:visible .editable-document"),
  ).toContainText("Camille & Gabriel");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("atelier-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("apercu-mobile.png") });
  await page.getByRole("button", { name: "Fermer l’aperçu" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  await expect(page.locator(".preview-hint")).toContainText(
    "Animation désactivée",
  );
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(page.locator(".preview-controls")).toContainText("Page 2");
  await page.getByRole("button", { name: "Fermer l’aperçu" }).click();
  expect(errors).toEqual([]);
});

test("les quinze modèles : pas de texte tronqué et PDF valide", async ({
  page,
  request,
}, testInfo) => {
  for (const template of templates) {
    const doc = createTemplateDocument(template.id);
    await page.setContent(printHtml(doc, {}));
    const overflow = await page
      .locator(".block-text")
      .evaluateAll((elements) =>
        elements
          .filter(
            (el) =>
              el.scrollHeight > el.clientHeight + 2 ||
              el.scrollWidth > el.clientWidth + 2,
          )
          .map((el) => el.textContent?.slice(0, 60)),
      );
    expect(overflow, template.name).toEqual([]);
  }
  const response = await request.post("/api/pdf", {
    data: { document: createTemplateDocument("botanique"), images: {} },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const pdf = await PDFDocument.load(await response.body());
  expect(pdf.getPageCount()).toBe(8);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Choisir le modèle Botanique", exact: true })
    .click();
  await page.getByRole("button", { name: "Carré", exact: false }).click();
  await page.getByRole("button", { name: "Ouvrir mon carnet" }).click();
  await expect(page).toHaveURL(/\/atelier\//);
  await saved(page);
  expect((await stored(page)).format).toEqual({ width: 148, height: 148 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: testInfo.outputPath("accueil-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("validation PDF : HTML, URL externe, format et texte trop long sont refusés", async ({
  request,
}) => {
  const doc = createTemplateDocument("minimaliste");
  expect(
    (
      await request.post("/api/pdf", {
        data: {
          document: { ...doc, html: "<script>bad()</script>" },
          images: {},
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/pdf", {
        data: {
          document: doc,
          images: { external: "https://example.com/image.jpg" },
        },
      })
    ).status(),
  ).toBe(400);
  doc.format.width = 1;
  expect(
    (
      await request.post("/api/pdf", { data: { document: doc, images: {} } })
    ).status(),
  ).toBe(400);
  doc.format.width = 148;
  const text = doc.pages[0].blocks.find((b) => b.content)!;
  text.height = 1;
  expect(
    (
      await request.post("/api/pdf", { data: { document: doc, images: {} } })
    ).status(),
  ).toBe(422);
});

import { test, expect } from "@playwright/test";

test("édition avancée, brouillon sauvegardé, format, pages impaires et projets", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Choisir le modèle Botanique", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ouvrir mon carnet", exact: true })
    .click();
  const editor = page.locator(".editor-shell:visible");
  await expect(editor.locator(".save-status")).toContainText("Enregistré");
  const title = editor
    .locator(".editable-document .document-block")
    .filter({ hasText: "Camille" })
    .first();
  await title.click();
  await page
    .getByRole("button", { name: "Modifier le texte", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Appliquer le texte", exact: true })
    .click();
  await expect(editor.locator(".save-status")).toContainText("Enregistré");
  await page
    .getByRole("button", { name: "Modifier le texte", exact: true })
    .click();
  await page.locator(".tiptap").fill("Un texte retrouvé");
  await expect(editor.locator(".save-status")).toContainText("Enregistré");
  await page
    .getByRole("button", { name: "Annuler", exact: true })
    .last()
    .click();
  await expect(title).toContainText("Camille");
  await page
    .getByRole("button", { name: "Modifier le texte", exact: true })
    .click();
  await page.locator(".tiptap").fill("Camille et Gabriel");
  await expect(editor.locator(".save-status")).toContainText("Enregistré");
  await page.reload();
  await expect(editor.locator(".editable-document")).toContainText(
    "Camille et Gabriel",
  );
  await editor
    .locator(".editable-document .document-block")
    .filter({ hasText: "Camille et Gabriel" })
    .click();
  await page
    .getByRole("button", { name: "Verrouiller l’élément", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Supprimer l’élément", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Déverrouiller l’élément", exact: true })
    .click();
  await page.getByLabel("Largeur", { exact: true }).fill("90");
  await page.getByLabel("Largeur", { exact: true }).press("Enter");
  await expect(title).toHaveCSS("width", /340\.\d+px/);
  await page
    .getByRole("button", { name: "Centrer en largeur", exact: true })
    .click();
  await expect(title).toHaveCSS("left", /109\.\d+px/);
  const oldBox = await title.boundingBox();
  const handle = editor.locator(".moveable-control.moveable-e");
  await expect(handle).toBeVisible();
  const h = await handle.boundingBox();
  await page.mouse.move(h!.x + h!.width / 2, h!.y + h!.height / 2);
  await page.mouse.down();
  await page.mouse.move(h!.x + 22, h!.y + h!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await title.boundingBox())!.width)
    .toBeGreaterThan(oldBox!.width + 8);
  await page.getByLabel("Rotation · degrés").fill("12");
  await page.getByLabel("Rotation · degrés").press("Enter");
  await page.getByRole("button", { name: "À l’avant", exact: true }).click();
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();
  expect(
    await editor
      .locator(".editable-document .block-text")
      .filter({ hasText: "Camille et Gabriel" })
      .count(),
  ).toBe(2);
  await page
    .getByRole("button", { name: "Supprimer l’élément", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Marges & repères", exact: true })
    .click();
  await expect(editor.locator(".page-margin-guide")).toBeVisible();
  await page
    .getByRole("button", { name: "Ajouter une page", exact: true })
    .click();
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  await expect(page.locator(".preview-overlay .flip-page")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(page.locator(".preview-controls")).toContainText("Page 2");
  await page.screenshot({
    path: testInfo.outputPath("modele-double-page.png"),
  });
  await page.getByRole("button", { name: "Fermer l’aperçu" }).click();
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  await page.getByRole("button", { name: "A4 portrait", exact: false }).click();
  await page
    .getByRole("button", { name: "Changer de format", exact: true })
    .click();
  await expect(editor.locator(".canvas-topbar")).toContainText("210 × 297 mm");
  await expect(editor.locator(".save-status")).toContainText("Enregistré");
  await page
    .getByRole("button", { name: "Retour aux carnets", exact: true })
    .click();
  const projects = page.locator(".project-card");
  await expect(projects).toHaveCount(1);
  await page.getByRole("button", { name: /^Dupliquer Carnet/ }).click();
  await expect(projects).toHaveCount(2);
  await page
    .getByRole("button", { name: /^Supprimer Carnet/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Cette action est définitive",
  );
  await page.getByRole("button", { name: "Conserver", exact: true }).click();
  await expect(projects).toHaveCount(2);
  await page
    .getByRole("button", { name: /^Supprimer Carnet/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Supprimer le carnet", exact: true })
    .click();
  await expect(projects).toHaveCount(1);
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Importer un projet", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "faux.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("ceci n’est pas un projet"),
  });
  await expect(page.locator(".notice-error")).toContainText("Archive invalide");
});

import { test, expect } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const admin = "admin@carnet.test";
const member = "member@carnet.test";
const password = "Une phrase pour nos carnets 2026!";
async function mailLink(email: string, reset = false) {
  const directory = join(process.env.AUTH_TEST_DATA_DIR!, "mail");
  let url = "";
  await expect
    .poll(async () => {
      const files = (await readdir(directory).catch(() => []))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .reverse();
      for (const file of files) {
        const message = JSON.parse(
          await readFile(join(directory, file), "utf8"),
        );
        if (
          message.to === email &&
          message.subject.includes(reset ? "Réinitialisez" : "Confirmez")
        ) {
          url = message.url;
          return true;
        }
      }
      return false;
    })
    .toBe(true);
  return url;
}

test("comptes vérifiés, administration, publication et autorisations", async ({
  page,
  browser,
}, testInfo) => {
  const origin = "http://localhost:3001";
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  await visitor.goto("/admin");
  await expect(visitor).toHaveURL(/\/connexion/);
  const unauthorized = await visitor.request.put(
    "/api/admin/templates/classique-ivoire",
    { headers: { Origin: origin }, data: {} },
  );
  expect(unauthorized.status()).toBe(401);

  await page.goto("/connexion");
  await page
    .getByRole("button", { name: "Créer un compte", exact: true })
    .click();
  await page.getByLabel("Votre prénom", { exact: true }).fill("Valentin");
  await page.getByLabel("Adresse e-mail", { exact: true }).fill(admin);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill(password);
  await page
    .getByRole("button", { name: "Créer mon compte", exact: true })
    .click();
  await expect(
    page.getByText("Un e-mail de validation vous attend.", { exact: false }),
  ).toBeVisible();
  expect((await page.request.get("/api/account")).status()).toBe(200);
  expect(
    (await (await page.request.get("/api/account")).json()).user,
  ).toBeNull();
  const beforeVerification = await page.request.post(
    "/api/auth/sign-in/email",
    { headers: { Origin: origin }, data: { email: admin, password } },
  );
  expect(beforeVerification.status()).toBe(403);
  await page.goto(await mailLink(admin));
  await expect(page).toHaveURL(/verified=1/);
  await expect(
    page.getByText("Votre adresse e-mail est confirmée.", { exact: false }),
  ).toBeVisible();
  const wrongPassword = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email: admin, password: "Un mauvais mot de passe!" },
  });
  expect(wrongPassword.status()).toBe(401);
  await page.getByLabel("Adresse e-mail", { exact: true }).fill(admin);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".admin-template-card")).toHaveCount(15);
  const user = (await (await page.request.get("/api/account")).json()).user;
  expect(user.admin).toBe(true);
  const cookies = await page.context().cookies();
  expect(
    cookies.some(
      (cookie) =>
        cookie.name.includes("session_token") &&
        cookie.httpOnly &&
        cookie.sameSite === "Lax",
    ),
  ).toBe(true);
  const original = await (
    await page.request.get("/api/templates/classique-ivoire")
  ).json();
  const crossOrigin = await page.request.put(
    "/api/admin/templates/classique-ivoire",
    { headers: { Origin: "https://example.net" }, data: {} },
  );
  expect(crossOrigin.status()).toBe(403);
  const forged = await page.request.put(
    "/api/admin/templates/classique-ivoire",
    {
      headers: { Origin: origin },
      data: {
        metadata: { name: "Test", description: "Test", category: "Nature" },
        document: { html: "<script>alert(1)</script>" },
        revision: 1,
        images: [],
      },
    },
  );
  expect(forged.status()).toBe(400);

  await page
    .locator(".admin-template-card")
    .first()
    .getByRole("link", { name: "Modifier", exact: true })
    .click();
  await expect(page.locator(".editable-document")).toBeVisible();
  await page
    .getByLabel("Nom du modèle", { exact: true })
    .fill("Ivoire — collection de test");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Un modèle revu dans l’espace administrateur.");
  const title = page
    .locator(".editable-document .document-block")
    .filter({ hasText: "Camille" })
    .first();
  await title.click();
  await page
    .getByRole("button", { name: "Modifier le texte", exact: true })
    .click();
  await page.locator(".tiptap").fill("Clara et Louis");
  await page
    .getByRole("button", { name: "Appliquer le texte", exact: true })
    .click();
  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#889b70";
    context.fillRect(0, 0, 400, 300);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Éléments", exact: true }).click();
  await page
    .locator(".library-item")
    .filter({ hasText: "Un souvenir en image" })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "modele.png",
    mimeType: "image/png",
    buffer: Buffer.from(imageBase64, "base64"),
  });
  await expect(page.locator(".editable-document img")).toHaveCount(1);
  await expect(page.locator(".save-status")).toContainText("Enregistré");
  await page.reload();
  await expect(page.locator(".editable-document")).toContainText(
    "Clara et Louis",
  );
  await expect(page.getByLabel("Nom du modèle", { exact: true })).toHaveValue(
    "Ivoire — collection de test",
  );
  await page
    .getByRole("button", { name: "Publier le modèle", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmer la publication", exact: true })
    .click();
  await expect(
    page.getByText("Le modèle a été publié", { exact: false }),
  ).toBeVisible();
  const published = await (
    await page.request.get("/api/templates/classique-ivoire")
  ).json();
  expect(published.revision).toBe(2);
  expect(published.images).toHaveLength(1);
  const publicImage = await page.request.get(
    `/api/templates/classique-ivoire/images/${published.images[0].id}`,
  );
  expect(publicImage.ok()).toBe(true);
  expect(publicImage.headers()["content-type"]).toBe("image/png");
  expect(JSON.stringify(published.document)).toContain("Clara et Louis");
  const conflict = await page.request.put(
    "/api/admin/templates/classique-ivoire",
    {
      headers: { Origin: origin },
      data: {
        metadata: {
          name: original.name,
          description: original.description,
          category: original.category,
        },
        document: original.document,
        images: [],
        revision: 1,
      },
    },
  );
  expect(conflict.status()).toBe(409);
  await visitor.goto("/");
  await expect(
    visitor.getByRole("button", {
      name: "Choisir le modèle Ivoire — collection de test",
      exact: true,
    }),
  ).toBeVisible();
  await visitor
    .getByRole("button", {
      name: "Choisir le modèle Ivoire — collection de test",
      exact: true,
    })
    .click();
  await visitor
    .getByRole("button", { name: "Ouvrir mon carnet", exact: true })
    .click();
  await expect(visitor.locator(".editable-document")).toContainText(
    "Clara et Louis",
  );
  await expect(visitor.locator(".editable-document img")).toHaveCount(1);
  expect(
    await visitor
      .locator(".editable-document img")
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBe(400);
  await page.screenshot({
    path: testInfo.outputPath("modele-admin-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Publier le modèle", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Publier ce modèle ?", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continuer à modifier", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("modele-admin-mobile.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/admin");
  await page
    .getByRole("button", {
      name: "Restaurer le modèle Ivoire — collection de test",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Restaurer et publier", exact: true })
    .click();
  await expect(
    page.getByText("Le modèle d’origine a été restauré.", { exact: true }),
  ).toBeVisible();
  await visitor.reload();
  await expect(visitor.locator(".editable-document")).toContainText(
    "Clara et Louis",
  );
  expect(
    (await (await page.request.get("/api/templates/classique-ivoire")).json())
      .name,
  ).toBe("Classique ivoire");
  const savedSessionCookie = cookies.find((cookie) =>
    cookie.name.includes("session_token"),
  )!;
  await page
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  const revoked = await page.request.get("/api/account", {
    headers: {
      Cookie: `${savedSessionCookie.name}=${savedSessionCookie.value}`,
    },
  });
  expect((await revoked.json()).user).toBeNull();

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  const registerMember = await memberPage.request.post(
    "/api/auth/sign-up/email",
    {
      headers: { Origin: origin },
      data: {
        email: member,
        name: "Invité",
        password,
        callbackURL: "/connexion?verified=1",
        role: "admin",
        emailVerified: true,
      },
    },
  );
  expect(registerMember.ok()).toBe(true);
  expect((await registerMember.json()).user.emailVerified).toBe(false);
  await memberPage.goto(await mailLink(member));
  await memberPage.getByLabel("Adresse e-mail", { exact: true }).fill(member);
  await memberPage.getByLabel("Mot de passe", { exact: true }).fill(password);
  await memberPage
    .getByRole("button", { name: "Se connecter", exact: true })
    .click();
  await expect(memberPage).toHaveURL(/\/$/);
  expect(
    (await (await memberPage.request.get("/api/account")).json()).user.admin,
  ).toBe(false);
  await memberPage.goto("/admin");
  await expect(memberPage).toHaveURL(/\/acces-refuse/);
  const forbidden = await memberPage.request.put(
    "/api/admin/templates/classique-ivoire",
    { headers: { Origin: origin }, data: {} },
  );
  expect(forbidden.status()).toBe(403);
  await memberPage.goto("/connexion");
  await memberPage
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await memberPage
    .getByRole("button", { name: "Mot de passe oublié ?", exact: true })
    .click();
  await memberPage.getByLabel("Adresse e-mail", { exact: true }).fill(member);
  await memberPage
    .getByRole("button", { name: "Envoyer le lien", exact: true })
    .click();
  await expect(
    memberPage.getByText("Si cette adresse possède un compte, vous recevrez", {
      exact: false,
    }),
  ).toBeVisible();
  await memberPage.goto(await mailLink(member, true));
  await memberPage
    .getByLabel("Mot de passe", { exact: true })
    .fill("Une nouvelle phrase pour les carnets!");
  await memberPage
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill("Une nouvelle phrase pour les carnets!");
  await memberPage
    .getByRole("button", { name: "Enregistrer le mot de passe", exact: true })
    .click();
  await expect(
    memberPage.getByText("Votre mot de passe a été modifié.", { exact: false }),
  ).toBeVisible();
  const replay = await memberPage.request.post("/api/auth/reset-password", {
    headers: { Origin: origin },
    data: {
      token: new URL(memberPage.url()).searchParams.get("token"),
      newPassword: password,
    },
  });
  expect(replay.ok()).toBe(false);
  await memberPage.setViewportSize({ width: 390, height: 844 });
  await memberPage.screenshot({
    path: testInfo.outputPath("connexion-mobile.png"),
    fullPage: true,
  });
  expect(
    await memberPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await memberContext.close();
  await anonymous.close();
});

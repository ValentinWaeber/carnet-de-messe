import { chromium, type Browser } from "playwright";
import { z } from "zod";
import { assetIds, documentSchema } from "@/lib/document";
import { detectedMime, MAX_IMAGE_BYTES } from "@/lib/images";
import { printHtml } from "@/lib/render";
import { safeFilename } from "@/lib/filename";

// Node.js is the default runtime. Cache Components forbids a runtime segment override.
const MAX_BODY = 40 * 1024 * 1024;
const inputSchema = z
  .object({
    document: documentSchema,
    images: z.record(
      z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/)
        .max(100),
      z.string().max(12 * 1024 * 1024),
    ),
  })
  .strict();
let running = 0;
async function readLimited(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY)
    throw new Error("Le projet dépasse la limite de 40 Mo pour le PDF.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Le document est absent.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new Error("Le projet dépasse la limite de 40 Mo pour le PDF.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function POST(request: Request) {
  if (running >= 2)
    return Response.json(
      { error: "Deux exports sont déjà en cours. Réessayez dans un instant." },
      { status: 429 },
    );
  let browser: Browser | undefined;
  let acquired = false;
  try {
    const input = inputSchema.safeParse(await readLimited(request));
    if (!input.success)
      return Response.json(
        {
          error:
            "Le document est invalide ou sa version n’est pas prise en charge.",
        },
        { status: 400 },
      );
    const { document: doc, images } = input.data;
    if (Object.keys(images).length > 30)
      throw new Error("Maximum 30 images par export.");
    let total = 0;
    for (const [id, src] of Object.entries(images)) {
      const match =
        /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
          src,
        );
      if (!match)
        throw new Error(
          "Une image est invalide. Les liens externes ne sont pas acceptés.",
        );
      const bytes = Buffer.from(match[2], "base64");
      total += bytes.length;
      if (
        !bytes.length ||
        bytes.length > MAX_IMAGE_BYTES ||
        total > 28 * 1024 * 1024 ||
        detectedMime(bytes) !== match[1] ||
        !assetIds(doc).includes(id)
      )
        throw new Error(
          "Images invalides ou trop volumineuses (8 Mo par image, 28 Mo au total).",
        );
    }
    if (assetIds(doc).some((id) => !images[id]))
      throw new Error("Une image manque pour l’export.");
    if (running >= 2)
      return Response.json(
        {
          error: "Deux exports sont déjà en cours. Réessayez dans un instant.",
        },
        { status: 429 },
      );
    running++;
    acquired = true;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ javaScriptEnabled: false });
    // Only embedded images and local system fonts are allowed. Never open a user-supplied URL.
    await context.route("**/*", (route) =>
      route.request().url().startsWith("data:")
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.setContent(printHtml(doc, images), {
      waitUntil: "load",
      timeout: 20000,
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map(async (image) => {
          await image.decode();
          if (
            image.naturalWidth > 10000 ||
            image.naturalHeight > 10000 ||
            image.naturalWidth * image.naturalHeight > 40000000
          )
            throw new Error("Image trop grande.");
        }),
      );
    });
    const overflows = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll<HTMLElement>(".block-text"),
        ).filter(
          (el) =>
            el.scrollHeight > el.clientHeight + 2 ||
            el.scrollWidth > el.clientWidth + 2,
        ).length,
    );
    if (overflows)
      return Response.json(
        {
          error: `${overflows} bloc(s) de texte débordent. Agrandissez leurs cadres ou répartissez le texte avant d’exporter.`,
        },
        { status: 422 },
      );
    const pdf = await page.pdf({
      width: `${doc.format.width}mm`,
      height: `${doc.format.height}mm`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename(doc.title)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Une erreur est survenue.";
    const install = message.includes("Executable doesn't exist");
    return Response.json(
      {
        error: install
          ? "Chromium n’est pas installé. Dans le terminal du projet, lancez npx.cmd playwright install chromium, puis réessayez."
          : `Impossible de créer le PDF : ${message.slice(0, 240)}`,
      },
      { status: install ? 503 : 400 },
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (acquired) running--;
  }
}

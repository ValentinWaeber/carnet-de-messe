import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;
export const MM_TO_PX = 96 / 25.4;
export const mmToPx = (mm: number) => mm * MM_TO_PX;
export const pxToMm = (px: number) => px / MM_TO_PX;
export const mmToPt = (mm: number) => (mm * 72) / 25.4;
export const ptToMm = (pt: number) => (pt * 25.4) / 72;
export const FONTS = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Arial, Helvetica, sans-serif",
  classic: "'Times New Roman', Times, serif",
} as const;
export const FORMATS = {
  a5: { width: 148, height: 210 },
  a4: { width: 210, height: 297 },
  square: { width: 148, height: 148 },
};
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const finite = z.number().finite();
export const richTextSchema = z
  .object({
    type: z.literal("doc"),
    content: z
      .array(
        z
          .object({
            type: z.literal("paragraph"),
            content: z
              .array(
                z.union([
                  z
                    .object({
                      type: z.literal("text"),
                      text: z.string().max(30000),
                      marks: z
                        .array(
                          z
                            .object({
                              type: z.enum(["bold", "italic", "underline"]),
                            })
                            .strict(),
                        )
                        .max(3)
                        .optional(),
                    })
                    .strict(),
                  z.object({ type: z.literal("hardBreak") }).strict(),
                ]),
              )
              .max(1500)
              .optional(),
          })
          .strict(),
      )
      .max(300),
  })
  .strict();
export type RichText = z.infer<typeof richTextSchema>;
export const blockSchema = z
  .object({
    id,
    type: z.enum([
      "title",
      "paragraph",
      "reading",
      "song",
      "image",
      "line",
      "decoration",
    ]),
    x: finite.min(-400).max(800),
    y: finite.min(-400).max(800),
    width: finite.min(1).max(800),
    height: finite.min(1).max(800),
    z: z.number().int().min(-1000).max(1000),
    rotation: finite.min(-360).max(360),
    locked: z.boolean(),
    content: richTextSchema.optional(),
    assetId: id.optional(),
    ornament: z
      .enum([
        "branch",
        "wreath",
        "flower",
        "cross",
        "frame",
        "arch",
        "circle",
        "wash",
        "sprig",
        "diamond",
      ])
      .optional(),
    style: z
      .object({
        font: z.enum(["serif", "sans", "classic"]),
        fontSize: finite.min(5).max(140),
        color,
        bold: z.boolean(),
        italic: z.boolean(),
        align: z.enum(["left", "center", "right", "justify"]),
        lineHeight: finite.min(0.8).max(3),
        letterSpacing: finite.min(0).max(8),
        fit: z.enum(["contain", "cover"]),
      })
      .strict(),
  })
  .strict();
export type Block = z.infer<typeof blockSchema>;
export const pageSchema = z
  .object({ id, background: color, blocks: z.array(blockSchema).max(80) })
  .strict();
export type DocumentPage = z.infer<typeof pageSchema>;
export const documentSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id,
    title: z.string().trim().min(1).max(150),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    format: z
      .object({
        width: finite.min(90).max(320),
        height: finite.min(90).max(420),
      })
      .strict(),
    margins: z
      .object({
        top: finite.min(0).max(40),
        right: finite.min(0).max(40),
        bottom: finite.min(0).max(40),
        left: finite.min(0).max(40),
      })
      .strict(),
    theme: z
      .object({
        name: z.string().max(100),
        paper: color,
        ink: color,
        accent: color,
      })
      .strict(),
    pages: z.array(pageSchema).min(2).max(80),
  })
  .strict()
  .superRefine((doc, ctx) => {
    const ids = [
      doc.id,
      ...doc.pages.flatMap((p) => [p.id, ...p.blocks.map((b) => b.id)]),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Les identifiants doivent être uniques.",
      });
    if (
      doc.margins.left + doc.margins.right >= doc.format.width ||
      doc.margins.top + doc.margins.bottom >= doc.format.height
    )
      ctx.addIssue({
        code: "custom",
        message: "Les marges dépassent le format.",
      });
    for (const p of doc.pages)
      for (const b of p.blocks) {
        if (
          ["title", "paragraph", "reading", "song"].includes(b.type) &&
          !b.content
        )
          ctx.addIssue({
            code: "custom",
            message: "Un bloc de texte doit contenir du texte.",
          });
        if (b.type === "image" && !b.assetId)
          ctx.addIssue({
            code: "custom",
            message: "Une image doit avoir une référence.",
          });
        if (b.type === "decoration" && !b.ornament)
          ctx.addIssue({
            code: "custom",
            message: "Une décoration doit avoir un motif.",
          });
      }
  });
export type BookDocument = z.infer<typeof documentSchema>;
export type ImageAsset = {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  blob: Blob;
};
export type AssetSources = Record<string, string>;
export const uid = () => crypto.randomUUID();
export const richText = (text: string): RichText => ({
  type: "doc",
  content: text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  })),
});
export const plainText = (content?: RichText) =>
  content?.content
    .map(
      (p) =>
        p.content?.map((n) => (n.type === "text" ? n.text : "\n")).join("") ??
        "",
    )
    .join("\n") ?? "";
export const isText = (b: Block) =>
  ["title", "paragraph", "reading", "song"].includes(b.type);
export function createBlock(type: Block["type"], ink = "#3c4239"): Block {
  return {
    id: uid(),
    type,
    x: 20,
    y: 30,
    width: 108,
    height: type === "line" ? 2 : type === "decoration" ? 45 : 35,
    z: 10,
    rotation: 0,
    locked: false,
    ...(type === "decoration" ? { ornament: "branch" as const } : {}),
    ...(["title", "paragraph", "reading", "song"].includes(type)
      ? {
          content: richText(
            type === "title"
              ? "Votre titre"
              : type === "reading"
                ? "Votre lecture\nRemplacez ce texte par la lecture choisie pour votre célébration."
                : type === "song"
                  ? "Votre chant\nPremier couplet à compléter.\nRefrain à compléter."
                  : "Vos mots, votre histoire. Double-cliquez pour modifier ce texte.",
          ),
        }
      : {}),
    style: {
      font: "serif",
      fontSize: type === "title" ? 24 : 12,
      color: ink,
      bold: false,
      italic: false,
      align: type === "title" ? "center" : "left",
      lineHeight: 1.5,
      letterSpacing: 0,
      fit: "contain",
    },
  };
}
export function duplicatePage(page: DocumentPage): DocumentPage {
  return {
    ...structuredClone(page),
    id: uid(),
    blocks: page.blocks.map((b) => ({ ...structuredClone(b), id: uid() })),
  };
}
/** Uniform scaling preserves block proportions. A changed aspect ratio leaves extra space or overflows. */
export function resizeDocument(
  doc: BookDocument,
  format: BookDocument["format"],
): BookDocument {
  const scale = Math.min(
    format.width / doc.format.width,
    format.height / doc.format.height,
  );
  return {
    ...doc,
    format: { ...format },
    margins: Object.fromEntries(
      Object.entries(doc.margins).map(([k, v]) => [k, Math.min(40, v * scale)]),
    ) as BookDocument["margins"],
    pages: doc.pages.map((p) => ({
      ...p,
      blocks: p.blocks.map((b) => ({
        ...b,
        x: Math.max(-400, Math.min(800, b.x * scale)),
        y: Math.max(-400, Math.min(800, b.y * scale)),
        width: Math.max(1, Math.min(800, b.width * scale)),
        height: Math.max(1, Math.min(800, b.height * scale)),
        style: {
          ...b.style,
          fontSize: Math.max(5, Math.min(140, b.style.fontSize * scale)),
          letterSpacing: Math.min(8, b.style.letterSpacing * scale),
        },
      })),
    })),
  };
}
export function boundsOverflow(b: Block, f: BookDocument["format"]) {
  const angle = (b.rotation * Math.PI) / 180;
  const w =
    Math.abs(b.width * Math.cos(angle)) + Math.abs(b.height * Math.sin(angle));
  const h =
    Math.abs(b.width * Math.sin(angle)) + Math.abs(b.height * Math.cos(angle));
  const x = b.x + (b.width - w) / 2,
    y = b.y + (b.height - h) / 2;
  return (
    x < -0.1 || y < -0.1 || x + w > f.width + 0.1 || y + h > f.height + 0.1
  );
}
export const assetIds = (doc: BookDocument) => [
  ...new Set(
    doc.pages.flatMap((p) =>
      p.blocks.flatMap((b) => (b.assetId ? [b.assetId] : [])),
    ),
  ),
];

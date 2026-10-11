import {
  FONTS,
  type Block,
  type BookDocument,
  type DocumentPage,
  type AssetSources,
  type RichText,
} from "./document";
import { ornamentSvg } from "./ornaments";

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function renderText(content?: RichText): string {
  return (
    content?.content
      .map(
        (p) =>
          `<p>${
            p.content
              ?.map((n) => {
                if (n.type === "hardBreak") return "<br>";
                let text = escapeHtml(n.text);
                for (const mark of n.marks ?? []) {
                  const tag = { bold: "strong", italic: "em", underline: "u" }[
                    mark.type
                  ];
                  text = `<${tag}>${text}</${tag}>`;
                }
                return text;
              })
              .join("") || "<br>"
          }</p>`,
      )
      .join("") ?? ""
  );
}
export const textStyle = (b: Block) =>
  `font-family:${FONTS[b.style.font]};font-size:${b.style.fontSize}pt;color:${b.style.color};font-weight:${b.style.bold ? 700 : 400};font-style:${b.style.italic ? "italic" : "normal"};text-align:${b.style.align};line-height:${b.style.lineHeight};letter-spacing:${b.style.letterSpacing}pt;`;
export const blockStyle = (b: Block) =>
  `position:absolute;left:${b.x}mm;top:${b.y}mm;width:${b.width}mm;height:${b.height}mm;z-index:${b.z};transform:rotate(${b.rotation}deg);${textStyle(b)}`;
export function blockContentHtml(b: Block, sources: AssetSources): string {
  if (b.type === "decoration") return ornamentSvg(b.ornament, b.style.color);
  if (b.type === "line")
    return `<div style="position:absolute;top:50%;width:100%;border-top:.25mm solid ${b.style.color}"></div>`;
  if (b.type === "image") {
    const src = b.assetId ? sources[b.assetId] : undefined;
    return src
      ? `<img alt="" src="${escapeHtml(src)}" style="width:100%;height:100%;object-fit:${b.style.fit};display:block">`
      : `<div class="image-placeholder">Image à importer</div>`;
  }
  return `<div class="block-text">${renderText(b.content)}</div>`;
}
export function pageHtml(
  page: DocumentPage,
  doc: BookDocument,
  sources: AssetSources,
): string {
  return `<div class="document-page" style="position:relative;width:${doc.format.width}mm;height:${doc.format.height}mm;background:${page.background};overflow:hidden">${[
    ...page.blocks,
  ]
    .sort((a, b) => a.z - b.z)
    .map(
      (b) =>
        `<div class="document-block" style="${blockStyle(b)}">${blockContentHtml(b, sources)}</div>`,
    )
    .join("")}</div>`;
}
export const DOCUMENT_CSS = `.document-page{box-sizing:border-box;isolation:isolate;flex:none}.document-page *{box-sizing:border-box}.block-text{width:100%;height:100%;overflow:hidden;overflow-wrap:break-word}.block-text p,.tiptap p{margin:0;min-height:1em}.block-text p+p,.tiptap p+p{margin-top:.45em}.image-placeholder{width:100%;height:100%;display:grid;place-items:center;border:1px dashed #b6b6a6;font:11pt Arial;color:#787b71;background:#eeeee7}.document-page svg{display:block}.document-page img{max-width:none}`;
export function printHtml(doc: BookDocument, sources: AssetSources): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title><style>${DOCUMENT_CSS}@page{size:${doc.format.width}mm ${doc.format.height}mm;margin:0}html,body{margin:0;padding:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.document-page{break-after:page;page-break-after:always}.document-page:last-child{break-after:auto;page-break-after:auto}</style></head><body>${doc.pages.map((p) => pageHtml(p, doc, sources)).join("")}</body></html>`;
}

import type { BookDocument, DocumentPage, AssetSources } from "@/lib/document";
import { mmToPx } from "@/lib/document";
import { pageHtml } from "@/lib/render";

export function PagePreview({
  doc,
  page = doc.pages[0],
  width = 200,
  sources = {},
}: {
  doc: BookDocument;
  page?: DocumentPage;
  width?: number;
  sources?: AssetSources;
}) {
  const scale = width / mmToPx(doc.format.width);
  return (
    <div
      className="page-preview"
      style={{ width, height: (width * doc.format.height) / doc.format.width }}
      aria-hidden="true"
    >
      <div
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        dangerouslySetInnerHTML={{ __html: pageHtml(page, doc, sources) }}
      />
    </div>
  );
}

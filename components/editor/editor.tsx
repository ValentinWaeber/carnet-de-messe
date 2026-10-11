"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  LayoutPanelLeft,
  SlidersHorizontal,
  ScanLine,
  X,
} from "lucide-react";
import {
  createBlock,
  duplicatePage,
  resizeDocument,
  boundsOverflow,
  uid,
  isText,
  assetIds,
  type Block,
  type RichText,
  type BookDocument,
} from "@/lib/document";
import { saveImage, blobDataUrl, storageError } from "@/lib/storage";
import { importImage } from "@/lib/images";
import { downloadBlob, exportArchive, safeFilename } from "@/lib/archive";
import { useBookEditor } from "./use-editor";
import { EditablePage } from "./editable-page";
import { PagePanel } from "./page-panel";
import { Properties } from "./properties";
import { TextEditor } from "./text-editor";
import { BookPreview } from "../book-preview";
import { Brand, IconButton, Modal, Notice } from "../ui";
import { FormatPicker } from "../format-picker";
import { EditorHeader, EditorFooter } from "./editor-chrome";
import { ExportDialog } from "./export-dialog";

export type EditorPublication = {
  busy: boolean;
  onPublish: (doc: BookDocument) => Promise<void>;
};
export default function Editor({
  id,
  publication,
  returnTo = "/#projets",
}: {
  id: string;
  publication?: EditorPublication;
  returnTo?: string;
}) {
  const router = useRouter(),
    book = useBookEditor(id),
    { doc, update, undo: undoAction, redo: redoAction } = book;
  const [pageId, setPageId] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [zoom, setZoom] = useState(100),
    [guides, setGuides] = useState(false),
    [preview, setPreview] = useState(false),
    [format, setFormat] = useState(false),
    [exporting, setExporting] = useState<"pdf" | "zip" | null>(null),
    [exportMenu, setExportMenu] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [panel, setPanel] = useState<"pages" | "properties" | null>(null),
    [rename, setRename] = useState(false),
    [title, setTitle] = useState(""),
    [deletePage, setDeletePage] = useState(false),
    [overflows, setOverflows] = useState<Record<string, string[]>>({}),
    [canvasSize, setCanvasSize] = useState({ width: 800, height: 650 }),
    [importing, setImporting] = useState(false);
  const canvas = useRef<HTMLDivElement>(null),
    imageInput = useRef<HTMLInputElement>(null),
    replace = useRef<string | null>(null),
    dropPosition = useRef<{ x: number; y: number } | null>(null);
  const currentPage = doc?.pages.find((p) => p.id === pageId) ?? doc?.pages[0];
  const active = currentPage?.id ?? "",
    pageIndex = doc?.pages.findIndex((p) => p.id === active) ?? 0;
  const block = currentPage?.blocks.find((b) => b.id === selected),
    editBlock = currentPage?.blocks.find((b) => b.id === editing);
  const selectPage = useCallback((id: string) => {
    setPageId(id);
    setSelected(null);
    setPanel(null);
  }, []);
  const patchBlock = useCallback(
    (page: string, id: string, patch: Partial<Block>) => {
      update((doc) => ({
        ...doc,
        pages: doc.pages.map((p) =>
          p.id === page
            ? {
                ...p,
                blocks: p.blocks.map((b) =>
                  b.id === id ? { ...b, ...patch } : b,
                ),
              }
            : p,
        ),
      }));
    },
    [update],
  );
  const onOverflow = useCallback(
    (id: string, ids: string[]) =>
      setOverflows((current) =>
        JSON.stringify(current[id]) === JSON.stringify(ids)
          ? current
          : { ...current, [id]: ids },
      ),
    [],
  );
  function beginEdit(id: string, page = active) {
    book.beginGroup();
    setPageId(page);
    setSelected(id);
    setEditing(id);
  }
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setCanvasSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [book.loaded]);
  const removeBlock = useCallback(() => {
    if (!block || block.locked) return;
    update((doc) => ({
      ...doc,
      pages: doc.pages.map((p) =>
        p.id === active
          ? { ...p, blocks: p.blocks.filter((b) => b.id !== block.id) }
          : p,
      ),
    }));
    setSelected(null);
  }, [block, active, update]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("input,textarea,select,[contenteditable=true],dialog") ||
        preview ||
        editing ||
        format ||
        exportMenu
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoAction();
        else undoAction();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoAction();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeBlock();
      }
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [
    undoAction,
    redoAction,
    removeBlock,
    preview,
    editing,
    format,
    exportMenu,
  ]);
  function addBlock(type: Block["type"], x?: number, y?: number) {
    if (!doc || !currentPage) return;
    if (currentPage.blocks.length >= 80) {
      book.setError("Une page peut contenir au maximum 80 éléments.");
      return;
    }
    if (type === "image") {
      replace.current = null;
      dropPosition.current = x !== undefined ? { x, y: y! } : null;
      imageInput.current?.click();
      return;
    }
    const b = createBlock(type, doc.theme.ink);
    b.width = Math.min(b.width, doc.format.width - 28);
    b.x = x ?? (doc.format.width - b.width) / 2;
    b.y =
      y ??
      Math.min(
        35 + currentPage.blocks.length * 5,
        doc.format.height - b.height - 14,
      );
    if (type === "decoration") {
      b.width = 45;
      b.style.color = doc.theme.accent;
    }
    update((doc) => ({
      ...doc,
      pages: doc.pages.map((p) =>
        p.id === active ? { ...p, blocks: [...p.blocks, b] } : p,
      ),
    }));
    setSelected(b.id);
    setPanel("properties");
  }
  async function addImage(file?: File) {
    if (!file || !doc || !currentPage) return;
    setImporting(true);
    book.setError("");
    try {
      if (assetIds(doc).length >= 30 && !replace.current)
        throw new Error(
          "Maximum 30 images par carnet. Réutilisez une image ou créez un autre projet.",
        );
      const asset = await importImage(file);
      await saveImage(asset);
      const src = await blobDataUrl(asset.blob);
      book.setSources((s) => ({ ...s, [asset.id]: src }));
      book.setImages((i) => [...i, asset]);
      if (replace.current)
        patchBlock(active, replace.current, { assetId: asset.id });
      else {
        const b = createBlock("image");
        b.assetId = asset.id;
        b.width = Math.min(80, doc.format.width - 28);
        b.height = Math.min(
          (b.width * asset.height) / asset.width,
          doc.format.height - 40,
        );
        b.width = (b.height * asset.width) / asset.height;
        b.x = dropPosition.current?.x ?? (doc.format.width - b.width) / 2;
        b.y = dropPosition.current?.y ?? 35;
        update((doc) => ({
          ...doc,
          pages: doc.pages.map((p) =>
            p.id === active ? { ...p, blocks: [...p.blocks, b] } : p,
          ),
        }));
        setSelected(b.id);
      }
    } catch (e) {
      book.setError(storageError(e));
    } finally {
      setImporting(false);
      replace.current = null;
      dropPosition.current = null;
      if (imageInput.current) imageInput.current.value = "";
    }
  }
  function addPage(copy = false) {
    if (!doc || !currentPage || doc.pages.length >= 80) return;
    const page = copy
      ? duplicatePage(currentPage)
      : { id: uid(), background: currentPage.background, blocks: [] };
    // New pages go before the back cover; duplicating keeps the original cover positions intact.
    const index = Math.min(pageIndex + 1, doc.pages.length - 1);
    update((doc) => {
      const pages = [...doc.pages];
      pages.splice(index, 0, page);
      return { ...doc, pages };
    });
    selectPage(page.id);
  }
  function reorder(from: number, to: number) {
    if (
      !doc ||
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= doc.pages.length ||
      to >= doc.pages.length
    )
      return;
    update((doc) => {
      const pages = [...doc.pages],
        page = pages.splice(from, 1)[0];
      pages.splice(to, 0, page);
      return { ...doc, pages };
    });
  }
  async function exportFile(kind: "pdf" | "zip") {
    if (!doc) return;
    setExporting(kind);
    book.setError("");
    try {
      await book.flush();
      if (kind === "zip")
        downloadBlob(
          await exportArchive(doc),
          `${safeFilename(doc.title)}.carnet.zip`,
        );
      else {
        const used = new Set(
          doc.pages.flatMap((p) =>
            p.blocks.flatMap((b) => (b.assetId ? [b.assetId] : [])),
          ),
        );
        const images = Object.fromEntries(
          Object.entries(book.sources).filter(([id]) => used.has(id)),
        );
        const response = await fetch("/api/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document: doc, images }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Le PDF n’a pas pu être généré.");
        }
        downloadBlob(await response.blob(), `${safeFilename(doc.title)}.pdf`);
      }
      setExportMenu(false);
    } catch (e) {
      book.setError(storageError(e));
    } finally {
      setExporting(null);
    }
  }
  if (!book.loaded)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" size={24} />
        Ouverture de votre carnet…
      </div>
    );
  if (!doc || !currentPage)
    return (
      <main className="loading-screen">
        <Brand />
        <Notice error>{book.error}</Notice>
        <Link className="button primary" href="/">
          Revenir à l’accueil
        </Link>
      </main>
    );
  const mobile = canvasSize.width < 580;
  let visible =
    pageIndex === 0 || pageIndex === doc.pages.length - 1 || mobile
      ? [currentPage]
      : [
          doc.pages[pageIndex % 2 === 1 ? pageIndex : pageIndex - 1],
          doc.pages[(pageIndex % 2 === 1 ? pageIndex : pageIndex - 1) + 1],
        ].filter((p) => p && p !== doc.pages.at(-1));
  if (!visible.length) visible = [currentPage];
  const fit = Math.min(
    1,
    (canvasSize.width - 80) /
      (((doc.format.width * 96) / 25.4) * visible.length),
    (canvasSize.height - 205) / ((doc.format.height * 96) / 25.4),
  );
  const scale = (Math.max(0.2, fit) * zoom) / 100;
  const warningCount = doc.pages.reduce(
    (total, p) =>
      total +
      (overflows[p.id]?.length ?? 0) +
      p.blocks.filter((b) => boundsOverflow(b, doc.format)).length,
    0,
  );
  const navigate = (delta: number) => {
    const next = Math.max(
      0,
      Math.min(
        doc.pages.length - 1,
        pageIndex + (visible.length === 2 ? delta * 2 : delta),
      ),
    );
    selectPage(doc.pages[next].id);
  };
  return (
    <div className="editor-shell">
      <EditorHeader
        publication={
          publication
            ? {
                busy:
                  publication.busy ||
                  !!editing ||
                  importing ||
                  book.status === "Échec de sauvegarde",
                onPublish: async () => {
                  try {
                    await book.flush();
                    await publication.onPublish(doc);
                  } catch (error) {
                    book.setError(storageError(error));
                  }
                },
              }
            : undefined
        }
        title={doc.title}
        status={book.status}
        canUndo={book.canUndo}
        canRedo={book.canRedo}
        zoom={zoom}
        onZoom={setZoom}
        onUndo={book.undo}
        onRedo={book.redo}
        onRename={() => {
          setTitle(doc.title);
          setRename(true);
        }}
        onPreview={() => setPreview(true)}
        onExport={() => setExportMenu(true)}
        onReturn={async () => {
          try {
            await book.flush();
            router.push(returnTo);
          } catch {
            book.setError(
              "Enregistrement impossible. Exportez votre projet avant de quitter.",
            );
          }
        }}
      />
      <div className="mobile-editor-tools">
        <button onClick={() => setPanel(panel === "pages" ? null : "pages")}>
          <LayoutPanelLeft size={17} />
          Pages & éléments
        </button>
        <button
          onClick={() => setPanel(panel === "properties" ? null : "properties")}
        >
          <SlidersHorizontal size={17} />
          Propriétés
        </button>
      </div>
      <div className="editor-body">
        <div
          className={`left-panel-slot ${panel === "pages" ? "mobile-panel-open" : ""}`}
        >
          <PagePanel
            doc={doc}
            active={active}
            sources={book.sources}
            onPage={selectPage}
            onAddPage={() => addPage()}
            onDuplicatePage={() => addPage(true)}
            onDeletePage={() => setDeletePage(true)}
            onReorder={reorder}
            onAddBlock={(type) => addBlock(type)}
          />
        </div>
        <main className="editor-canvas" ref={canvas}>
          <div className="canvas-topbar">
            <span>
              {pageIndex === 0
                ? "Première de couverture"
                : pageIndex === doc.pages.length - 1
                  ? "Dernière de couverture"
                  : "Pages intérieures"}
              <span className="canvas-format">
                {" "}
                · {doc.format.width} × {doc.format.height} mm
              </span>
            </span>
            <button
              className={`guide-toggle ${guides ? "active" : ""}`}
              aria-pressed={guides}
              onClick={() => setGuides(!guides)}
            >
              <ScanLine size={14} />
              Marges & repères
            </button>
          </div>
          {book.error && (
            <div className="editor-error">
              <Notice error>{book.error}</Notice>
              <IconButton
                label="Masquer le message"
                onClick={() => book.setError("")}
              >
                <X size={15} />
              </IconButton>
            </div>
          )}
          {importing && (
            <div className="editor-import-status" role="status">
              <LoaderCircle className="spin" size={15} />
              Importation de l’image…
            </div>
          )}
          <div className="canvas-scroll">
            <div
              className={`book-spread ${visible.length === 2 ? "double-spread" : "single-spread"}`}
              style={{
                minWidth:
                  ((doc.format.width * 96) / 25.4) * scale * visible.length,
              }}
            >
              {visible.map((page) => (
                <div
                  className={`book-edit-page ${page.id === active ? "active-page" : ""}`}
                  key={page.id}
                >
                  <EditablePage
                    doc={doc}
                    page={page}
                    sources={book.sources}
                    scale={scale}
                    selected={page.id === active ? selected : null}
                    onSelect={(id) => {
                      setPageId(page.id);
                      setSelected(id);
                    }}
                    onEdit={(id) => {
                      const b = page.blocks.find((b) => b.id === id);
                      if (b && isText(b) && !b.locked) {
                        beginEdit(id, page.id);
                      }
                    }}
                    onChange={(id, patch) => patchBlock(page.id, id, patch)}
                    onDropBlock={(type, x, y) => {
                      setPageId(page.id);
                      const b = createBlock(type, doc.theme.ink);
                      if (type === "image") {
                        dropPosition.current = { x, y };
                        replace.current = null;
                        imageInput.current?.click();
                        return;
                      }
                      if (page.blocks.length >= 80) return;
                      b.x = x;
                      b.y = y;
                      update((doc) => ({
                        ...doc,
                        pages: doc.pages.map((p) =>
                          p.id === page.id
                            ? { ...p, blocks: [...p.blocks, b] }
                            : p,
                        ),
                      }));
                      setSelected(b.id);
                    }}
                    guides={guides}
                    onOverflow={onOverflow}
                  />
                  <span className="canvas-page-number">
                    {doc.pages.findIndex((p) => p.id === page.id) + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="canvas-bottom">
            <div className="canvas-hint">
              {block
                ? block.locked
                  ? "Élément verrouillé"
                  : "Glissez pour déplacer · Poignées pour redimensionner"
                : "Sélectionnez un élément, imaginez la suite."}
            </div>
            <div className="page-navigation">
              <IconButton
                label="Pages précédentes"
                disabled={pageIndex === 0}
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <span>
                {visible
                  .map(
                    (p) => doc.pages.findIndex((page) => page.id === p.id) + 1,
                  )
                  .join(" – ")}
                <small> / {doc.pages.length}</small>
              </span>
              <IconButton
                label="Pages suivantes"
                disabled={pageIndex === doc.pages.length - 1}
                onClick={() => navigate(1)}
              >
                <ChevronRight size={18} />
              </IconButton>
            </div>
          </div>
        </main>
        <div
          className={`right-panel-slot ${panel === "properties" ? "mobile-panel-open" : ""}`}
        >
          <Properties
            doc={doc}
            block={block}
            image={book.images.find((i) => i.id === block?.assetId)}
            textOverflow={!!block && !!overflows[active]?.includes(block.id)}
            boundsWarning={!!block && boundsOverflow(block, doc.format)}
            onPatch={(patch) => block && patchBlock(active, block.id, patch)}
            onDelete={removeBlock}
            onDuplicate={() => {
              if (!block || currentPage.blocks.length >= 80) return;
              const copy = {
                ...structuredClone(block),
                id: uid(),
                x: block.x + 3,
                y: block.y + 3,
                locked: false,
              };
              update((doc) => ({
                ...doc,
                pages: doc.pages.map((p) =>
                  p.id === active ? { ...p, blocks: [...p.blocks, copy] } : p,
                ),
              }));
              setSelected(copy.id);
            }}
            onEdit={() => {
              if (selected) beginEdit(selected);
            }}
            onFormat={() => setFormat(true)}
            pageBackground={currentPage.background}
            onPageBackground={(background) =>
              update((doc) => ({
                ...doc,
                pages: doc.pages.map((p) =>
                  p.id === active ? { ...p, background } : p,
                ),
              }))
            }
            onMargin={(key, n) =>
              update((doc) => ({
                ...doc,
                margins: { ...doc.margins, [key]: n },
              }))
            }
            onReplaceImage={() => {
              replace.current = selected;
              imageInput.current?.click();
            }}
            onLayer={(front) =>
              block &&
              patchBlock(active, block.id, {
                z: Math.max(
                  -1000,
                  Math.min(
                    1000,
                    (front
                      ? Math.max(...currentPage.blocks.map((b) => b.z))
                      : Math.min(...currentPage.blocks.map((b) => b.z))) +
                      (front ? 1 : -1),
                  ),
                ),
              })
            }
          />
        </div>
      </div>
      <EditorFooter
        pageCount={doc.pages.length}
        theme={doc.theme.name}
        warningCount={warningCount}
      />
      <input
        ref={imageInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => addImage(e.target.files?.[0])}
      />
      {preview && (
        <BookPreview
          doc={doc}
          sources={book.sources}
          onClose={() => setPreview(false)}
        />
      )}
      {editing && editBlock && (
        <TextEditor
          key={editBlock.id}
          block={editBlock}
          onDraft={(text) =>
            patchBlock(active, editBlock.id, { content: text })
          }
          onCancel={() => {
            book.cancelGroup();
            setEditing(null);
          }}
          onDone={(text: RichText) => {
            patchBlock(active, editBlock.id, { content: text });
            book.endGroup();
            setEditing(null);
          }}
        />
      )}
      {format && (
        <FormatPicker
          title="Changer le format du carnet"
          initial={doc.format}
          resizing
          onClose={() => setFormat(false)}
          onConfirm={(f) => {
            update((doc) => resizeDocument(doc, f));
            setFormat(false);
          }}
        />
      )}
      {rename && (
        <Modal title="Le nom de votre carnet" onClose={() => setRename(false)}>
          <label>
            Nom du projet
            <input
              autoFocus
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={!title.trim()}
              onClick={() => {
                update((doc) => ({ ...doc, title: title.trim() }));
                setRename(false);
              }}
            >
              Enregistrer le nom
            </button>
          </div>
        </Modal>
      )}
      {deletePage && (
        <Modal
          title="Supprimer cette page ?"
          onClose={() => setDeletePage(false)}
        >
          <p>
            La page {pageIndex + 1} et ses éléments seront supprimés. Vous
            pourrez annuler cette opération.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeletePage(false)}
            >
              Conserver
            </button>
            <button
              className="button danger"
              onClick={() => {
                const next = doc.pages[Math.max(0, pageIndex - 1)].id;
                update((doc) => ({
                  ...doc,
                  pages: doc.pages.filter((p) => p.id !== active),
                }));
                selectPage(next);
                setDeletePage(false);
              }}
            >
              Supprimer la page
            </button>
          </div>
        </Modal>
      )}
      {exportMenu && (
        <ExportDialog
          doc={doc}
          error={book.error}
          warningCount={warningCount}
          exporting={exporting}
          onClose={() => setExportMenu(false)}
          onExport={exportFile}
        />
      )}
    </div>
  );
}

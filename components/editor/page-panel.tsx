"use client";
import { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  AlignLeft,
  BookOpen,
  Music,
  Image as ImageIcon,
  Minus,
  Leaf,
  GripVertical,
} from "lucide-react";
import type { Block, BookDocument, AssetSources } from "@/lib/document";
import { PagePreview } from "../page-preview";
import { IconButton } from "../ui";
import { BLOCK_NAMES } from "./properties";

const blocks: [Block["type"], typeof Type, string][] = [
  ["title", Type, "Les grands mots"],
  ["paragraph", AlignLeft, "Votre histoire"],
  ["reading", BookOpen, "La parole partagée"],
  ["song", Music, "Couplets et refrains"],
  ["image", ImageIcon, "Un souvenir en image"],
  ["line", Minus, "Un trait délicat"],
  ["decoration", Leaf, "La touche finale"],
];
export function PagePanel({
  doc,
  active,
  sources,
  onPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorder,
  onAddBlock,
}: {
  doc: BookDocument;
  active: string;
  sources: AssetSources;
  onPage: (id: string) => void;
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
  onReorder: (from: number, to: number) => void;
  onAddBlock: (type: Block["type"]) => void;
}) {
  const [tab, setTab] = useState<"pages" | "blocks">("pages");
  const index = doc.pages.findIndex((p) => p.id === active);
  return (
    <aside className="pages-panel">
      <div className="panel-tabs">
        <button
          className={tab === "pages" ? "active" : ""}
          onClick={() => setTab("pages")}
        >
          Pages <span>{doc.pages.length}</span>
        </button>
        <button
          className={tab === "blocks" ? "active" : ""}
          onClick={() => setTab("blocks")}
        >
          Éléments
        </button>
      </div>
      {tab === "pages" ? (
        <>
          <div className="page-list">
            {doc.pages.map((page, i) => (
              <button
                key={page.id}
                className={`page-list-item ${page.id === active ? "active" : ""}`}
                onClick={() => onPage(page.id)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/x-carnet-page",
                    String(i),
                  );
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = e.dataTransfer.getData(
                    "application/x-carnet-page",
                  );
                  if (from !== "") onReorder(Number(from), i);
                }}
                aria-label={`Page ${i + 1}${i === 0 ? ", première de couverture" : i === doc.pages.length - 1 ? ", dernière de couverture" : ""}`}
              >
                <GripVertical className="page-grip" size={13} />
                <PagePreview
                  doc={doc}
                  page={page}
                  width={55}
                  sources={sources}
                />
                <span>
                  <strong>{String(i + 1).padStart(2, "0")}</strong>
                  <small>
                    {i === 0
                      ? "Couverture"
                      : i === doc.pages.length - 1
                        ? "Dos du carnet"
                        : `Page ${i + 1}`}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <div className="page-panel-bottom">
            <div className="page-tools">
              <IconButton
                label="Monter la page"
                disabled={index === 0}
                onClick={() => onReorder(index, index - 1)}
              >
                <ChevronUp size={16} />
              </IconButton>
              <IconButton
                label="Descendre la page"
                disabled={index === doc.pages.length - 1}
                onClick={() => onReorder(index, index + 1)}
              >
                <ChevronDown size={16} />
              </IconButton>
              <IconButton
                label="Dupliquer la page"
                disabled={doc.pages.length >= 80}
                onClick={onDuplicatePage}
              >
                <Copy size={15} />
              </IconButton>
              <IconButton
                label="Supprimer la page"
                disabled={doc.pages.length <= 2}
                onClick={onDeletePage}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
            <button
              className="button secondary full-width"
              disabled={doc.pages.length >= 80}
              onClick={onAddPage}
            >
              <Plus size={15} />
              Ajouter une page
            </button>
            <p className="field-help">
              Glissez les pages pour changer leur ordre.
            </p>
          </div>
        </>
      ) : (
        <div className="block-library">
          <p>
            Un clic pour ajouter.
            <br />
            Ou glissez un élément dans le livre.
          </p>
          {blocks.map(([type, Icon, subtitle]) => (
            <button
              key={type}
              className="library-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-carnet-block", type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onAddBlock(type)}
            >
              <span className="library-icon">
                <Icon size={20} strokeWidth={1.4} />
              </span>
              <span>
                <strong>{BLOCK_NAMES[type]}</strong>
                <small>{subtitle}</small>
              </span>
              <Plus size={14} />
            </button>
          ))}
          <div className="library-note">
            Tout est personnalisable : les mots, les couleurs et la place de
            chaque élément.
          </div>
        </div>
      )}
    </aside>
  );
}

"use client";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Eye,
  Download,
  Check,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { Brand, IconButton } from "../ui";
import type { SaveStatus } from "./use-editor";

type HeaderProps = {
  title: string;
  status: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onReturn: () => void;
  onRename: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoom: (n: number) => void;
  onPreview: () => void;
  onExport: () => void;
};
export function EditorHeader({
  title,
  status,
  canUndo,
  canRedo,
  zoom,
  onReturn,
  onRename,
  onUndo,
  onRedo,
  onZoom,
  onPreview,
  onExport,
}: HeaderProps) {
  return (
    <header className="editor-header">
      <div className="editor-header-left">
        <IconButton label="Retour aux carnets" onClick={onReturn}>
          <ArrowLeft size={19} />
        </IconButton>
        <span className="header-divider" />
        <div className="editor-title">
          <button title="Renommer le carnet" onClick={onRename}>
            {title}
            <Pencil size={12} />
          </button>
          <span
            className={`save-status ${status === "Échec de sauvegarde" ? "error" : ""}`}
            role="status"
          >
            {status === "Enregistré" ? (
              <Check size={11} />
            ) : status === "Échec de sauvegarde" ? (
              <AlertTriangle size={11} />
            ) : (
              <span className="saving-dot" />
            )}
            {status}
            <span className="saved-device"> · Sur cet appareil</span>
          </span>
        </div>
      </div>
      <div className="editor-header-tools">
        <div className="history-tools">
          <IconButton label="Annuler" disabled={!canUndo} onClick={onUndo}>
            <Undo2 size={18} />
          </IconButton>
          <IconButton label="Rétablir" disabled={!canRedo} onClick={onRedo}>
            <Redo2 size={18} />
          </IconButton>
        </div>
        <span className="header-divider" />
        <label className="zoom-control">
          <span className="sr-only">Zoom du carnet</span>
          <select
            aria-label="Zoom du carnet"
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
          >
            {[50, 75, 100, 125, 150, 200].map((n) => (
              <option key={n} value={n}>
                {n} %
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary small" onClick={onPreview}>
          <Eye size={16} />
          <span>Aperçu</span>
        </button>
        <button className="button primary small" onClick={onExport}>
          <Download size={16} />
          <span>Exporter</span>
        </button>
      </div>
    </header>
  );
}
export function EditorFooter({
  pageCount,
  theme,
  warningCount,
}: {
  pageCount: number;
  theme: string;
  warningCount: number;
}) {
  return (
    <footer className="editor-footer">
      <Brand compact />
      <span>
        {pageCount} pages · {theme}
      </span>
      {warningCount > 0 ? (
        <span className="footer-warning">
          <AlertTriangle size={12} />
          {warningCount} point{warningCount > 1 ? "s" : ""} à vérifier
        </span>
      ) : (
        <span>Votre célébration prend forme.</span>
      )}
    </footer>
  );
}

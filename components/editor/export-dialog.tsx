"use client";
import { Download, LoaderCircle, FileText, FileArchive } from "lucide-react";
import type { BookDocument } from "@/lib/document";
import { Modal, Notice } from "../ui";
export function ExportDialog({
  doc,
  error,
  warningCount,
  exporting,
  onClose,
  onExport,
}: {
  doc: BookDocument;
  error: string;
  warningCount: number;
  exporting: "pdf" | "zip" | null;
  onClose: () => void;
  onExport: (kind: "pdf" | "zip") => void;
}) {
  return (
    <Modal
      title="Votre carnet, prêt à être partagé"
      onClose={() => {
        if (!exporting) onClose();
      }}
    >
      <p className="muted">
        Gardez une copie de votre travail ou préparez son impression.
      </p>
      {warningCount > 0 && (
        <Notice>
          Certains éléments demandent une vérification ({warningCount}). Les
          textes qui débordent doivent être corrigés avant l’export PDF.
        </Notice>
      )}
      {error && <Notice error>{error}</Notice>}
      <div className="export-options">
        <button disabled={!!exporting} onClick={() => onExport("pdf")}>
          <span className="export-icon">
            {exporting === "pdf" ? (
              <LoaderCircle className="spin" />
            ) : (
              <FileText />
            )}
          </span>
          <span>
            <strong>
              {exporting === "pdf" ? "Création du PDF…" : "Télécharger le PDF"}
            </strong>
            <small>
              {doc.pages.length} pages · {doc.format.width} ×{" "}
              {doc.format.height} mm
              <br />
              Texte sélectionnable, pages dans l’ordre de lecture.
            </small>
          </span>
          <Download size={18} />
        </button>
        <button disabled={!!exporting} onClick={() => onExport("zip")}>
          <span className="export-icon">
            {exporting === "zip" ? (
              <LoaderCircle className="spin" />
            ) : (
              <FileArchive />
            )}
          </span>
          <span>
            <strong>
              {exporting === "zip"
                ? "Préparation du projet…"
                : "Exporter le projet éditable"}
            </strong>
            <small>
              Une archive ZIP avec le document et ses images.
              <br />À réimporter pour continuer sur un autre appareil.
            </small>
          </span>
          <Download size={18} />
        </button>
      </div>
      <p className="field-help">
        Vérifiez le PDF avant impression, à taille réelle (100 %). L’imposition
        en livret et la conformité PDF/X ne sont pas incluses.
      </p>
    </Modal>
  );
}

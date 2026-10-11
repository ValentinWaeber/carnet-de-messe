"use client";
import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { FORMATS, type BookDocument } from "@/lib/document";
import { Modal } from "./ui";

export function FormatPicker({
  title = "Choisissez votre format",
  initial = FORMATS.a5,
  onClose,
  onConfirm,
  resizing = false,
  busy = false,
}: {
  title?: string;
  initial?: BookDocument["format"];
  onClose: () => void;
  onConfirm: (format: BookDocument["format"]) => void;
  resizing?: boolean;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<string>(
    Object.entries(FORMATS).find(
      ([, f]) => f.width === initial.width && f.height === initial.height,
    )?.[0] ?? "custom",
  );
  const [width, setWidth] = useState(initial.width),
    [height, setHeight] = useState(initial.height);
  const format =
    selected === "custom"
      ? { width, height }
      : FORMATS[selected as keyof typeof FORMATS];
  const valid =
    format.width >= 90 &&
    format.width <= 320 &&
    format.height >= 90 &&
    format.height <= 420;
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">
        Les dimensions correspondent à une page du carnet fermé.
      </p>
      <div className="format-options">
        {[
          ["a5", "A5 portrait", "148 × 210 mm"],
          ["a4", "A4 portrait", "210 × 297 mm"],
          ["square", "Carré", "148 × 148 mm"],
          ["custom", "Sur mesure", "À votre mesure"],
        ].map(([id, name, description]) => (
          <button
            className={`format-option ${selected === id ? "selected" : ""}`}
            key={id}
            onClick={() => setSelected(id)}
          >
            <span className={`format-shape ${id}`} />
            <strong>{name}</strong>
            <small>{description}</small>
            {selected === id && <Check size={15} />}
          </button>
        ))}
      </div>
      {selected === "custom" && (
        <div className="field-row">
          <label>
            Largeur (90–320 mm)
            <input
              type="number"
              min="90"
              max="320"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>
          <label>
            Hauteur (90–420 mm)
            <input
              type="number"
              min="90"
              max="420"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>
        </div>
      )}
      {resizing && (
        <p className="notice">
          Les blocs et le texte seront redimensionnés avec le même coefficient,
          calculé pour tenir dans le nouveau format. Un ratio différent peut
          laisser de l’espace libre. Vérifiez les cadres et les débordements
          après le changement.
        </p>
      )}
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          Annuler
        </button>
        <button
          className="button primary"
          disabled={!valid || busy}
          onClick={() => onConfirm(format)}
        >
          {busy
            ? "Création…"
            : resizing
              ? "Changer de format"
              : "Ouvrir mon carnet"}
          <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}

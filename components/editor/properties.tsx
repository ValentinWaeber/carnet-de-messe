"use client";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Copy,
  Trash2,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Pencil,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
} from "lucide-react";
import {
  isText,
  plainText,
  type Block,
  type BookDocument,
  type ImageAsset,
} from "@/lib/document";
import { imageDpi } from "@/lib/images";
import { IconButton } from "../ui";

export const BLOCK_NAMES: Record<Block["type"], string> = {
  title: "Titre",
  paragraph: "Paragraphe",
  reading: "Lecture",
  song: "Chant",
  image: "Image",
  line: "Séparateur",
  decoration: "Décoration",
};
function NumberField({
  label,
  value,
  min = -400,
  max = 800,
  step = 0.5,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        key={value}
        type="number"
        defaultValue={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (e.target.value && Number.isFinite(n) && n >= min && n <= max)
            onChange(n);
          else e.target.value = String(Math.round(value * 100) / 100);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
export function Properties({
  doc,
  block,
  image,
  textOverflow,
  boundsWarning,
  onPatch,
  onDelete,
  onDuplicate,
  onEdit,
  onFormat,
  onPageBackground,
  pageBackground,
  onMargin,
  onReplaceImage,
  onLayer,
}: {
  doc: BookDocument;
  block?: Block;
  image?: ImageAsset;
  textOverflow: boolean;
  boundsWarning: boolean;
  onPatch: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onFormat: () => void;
  onPageBackground: (color: string) => void;
  pageBackground: string;
  onMargin: (key: keyof BookDocument["margins"], n: number) => void;
  onReplaceImage: () => void;
  onLayer: (front: boolean) => void;
}) {
  const style = (patch: Partial<Block["style"]>) =>
    block && onPatch({ style: { ...block.style, ...patch } });
  if (!block)
    return (
      <aside className="properties-panel">
        <div className="panel-heading">
          <h2>Le carnet</h2>
          <span className="subtle-dot" />
        </div>
        <div className="property-section">
          <p className="panel-description">
            Sélectionnez un élément dans le livre pour ajuster sa mise en page.
          </p>
          <h3>Format de la page</h3>
          <div className="format-summary">
            <span>
              {doc.format.width} × {doc.format.height} mm
            </span>
            <button className="text-button" onClick={onFormat}>
              Modifier
            </button>
          </div>
          <p className="field-help">Dimensions du carnet fermé.</p>
        </div>
        <div className="property-section">
          <h3>Cette page</h3>
          <label className="color-field">
            Couleur du papier
            <input
              type="color"
              value={pageBackground}
              onChange={(e) => onPageBackground(e.target.value)}
            />
          </label>
        </div>
        <div className="property-section">
          <h3>Marges du carnet · mm</h3>
          <div className="field-row">
            <NumberField
              label="Haut"
              value={doc.margins.top}
              min={0}
              max={40}
              onChange={(n) => onMargin("top", n)}
            />
            <NumberField
              label="Bas"
              value={doc.margins.bottom}
              min={0}
              max={40}
              onChange={(n) => onMargin("bottom", n)}
            />
          </div>
          <div className="field-row">
            <NumberField
              label="Gauche"
              value={doc.margins.left}
              min={0}
              max={40}
              onChange={(n) => onMargin("left", n)}
            />
            <NumberField
              label="Droite"
              value={doc.margins.right}
              min={0}
              max={40}
              onChange={(n) => onMargin("right", n)}
            />
          </div>
          <p className="field-help">
            Les marges sont des repères. Elles ne déplacent pas les blocs
            existants.
          </p>
        </div>
        <div className="editor-tip">
          <span>Un petit conseil</span>
          <p>
            Double-cliquez sur un texte pour lui donner vos mots. Les poignées
            permettent de redimensionner son cadre.
          </p>
        </div>
      </aside>
    );
  const dpi = image
    ? Math.min(
        imageDpi(image.width, block.width),
        imageDpi(image.height, block.height),
      )
    : null;
  return (
    <aside className="properties-panel">
      <div className="panel-heading">
        <h2>{BLOCK_NAMES[block.type]}</h2>
        <IconButton
          label={
            block.locked ? "Déverrouiller l’élément" : "Verrouiller l’élément"
          }
          onClick={() => onPatch({ locked: !block.locked })}
        >
          {block.locked ? <Lock size={16} /> : <Unlock size={16} />}
        </IconButton>
      </div>
      {block.locked && (
        <p className="panel-locked">
          <Lock size={13} /> Élément verrouillé
        </p>
      )}
      {(textOverflow || boundsWarning) && (
        <div className="block-warning" role="alert">
          {textOverflow && (
            <p>
              Le texte dépasse son cadre. Agrandissez-le, réduisez la taille du
              texte ou répartissez-le sur une autre page.
            </p>
          )}
          {boundsWarning && (
            <p>
              Cet élément dépasse les limites de la page et sera coupé à
              l’impression.
            </p>
          )}
        </div>
      )}
      <fieldset disabled={block.locked}>
        {isText(block) && (
          <div className="property-section">
            <button className="button secondary full-width" onClick={onEdit}>
              <Pencil size={15} />
              Modifier le texte
            </button>
            <p className="text-excerpt">
              {plainText(block.content).slice(0, 100)}
              {plainText(block.content).length > 100 ? "…" : ""}
            </p>
            <label>
              Police
              <select
                value={block.style.font}
                onChange={(e) =>
                  style({ font: e.target.value as Block["style"]["font"] })
                }
              >
                <option value="serif">Georgia · élégante</option>
                <option value="sans">Arial · épurée</option>
                <option value="classic">Times · classique</option>
              </select>
            </label>
            <div className="field-row">
              <NumberField
                label="Taille · pt"
                value={block.style.fontSize}
                min={5}
                max={140}
                step={1}
                onChange={(n) => style({ fontSize: n })}
              />
              <NumberField
                label="Interligne"
                value={block.style.lineHeight}
                min={0.8}
                max={3}
                step={0.1}
                onChange={(n) => style({ lineHeight: n })}
              />
            </div>
            <div className="segmented-actions">
              <IconButton
                label="Gras"
                aria-pressed={block.style.bold}
                onClick={() => style({ bold: !block.style.bold })}
              >
                <Bold size={16} />
              </IconButton>
              <IconButton
                label="Italique"
                aria-pressed={block.style.italic}
                onClick={() => style({ italic: !block.style.italic })}
              >
                <Italic size={16} />
              </IconButton>
              <span className="toolbar-divider" />
              {(
                [
                  ["left", AlignLeft],
                  ["center", AlignCenter],
                  ["right", AlignRight],
                  ["justify", AlignJustify],
                ] as const
              ).map(([align, Icon]) => (
                <IconButton
                  key={align}
                  label={`Alignement ${{ left: "à gauche", center: "centré", right: "à droite", justify: "justifié" }[align]}`}
                  aria-pressed={block.style.align === align}
                  onClick={() => style({ align })}
                >
                  <Icon size={15} />
                </IconButton>
              ))}
            </div>
            <NumberField
              label="Espacement des lettres · pt"
              value={block.style.letterSpacing}
              min={0}
              max={8}
              step={0.1}
              onChange={(n) => style({ letterSpacing: n })}
            />
          </div>
        )}
        {block.type === "image" && (
          <div className="property-section">
            <button
              className="button secondary full-width"
              onClick={onReplaceImage}
            >
              <ImageIcon size={15} />
              Remplacer l’image
            </button>
            <label>
              Dans le cadre
              <select
                value={block.style.fit}
                onChange={(e) =>
                  style({ fit: e.target.value as "contain" | "cover" })
                }
              >
                <option value="contain">Ajuster · image entière</option>
                <option value="cover">Remplir · image recadrée</option>
              </select>
            </label>
            {image && (
              <p className="field-help">
                {image.name}
                <br />
                {image.width} × {image.height} px · environ {Math.round(dpi!)}{" "}
                ppp
              </p>
            )}
            {dpi !== null && dpi < 180 && (
              <p className="block-warning">
                Définition faible pour l’impression. Préférez une image plus
                grande ou un cadre plus petit (300 ppp recommandés).
              </p>
            )}
          </div>
        )}
        {block.type === "decoration" && (
          <div className="property-section">
            <label>
              Ornement
              <select
                value={block.ornament}
                onChange={(e) =>
                  onPatch({ ornament: e.target.value as Block["ornament"] })
                }
              >
                {[
                  ["branch", "Branche"],
                  ["wreath", "Couronne"],
                  ["flower", "Fleur"],
                  ["cross", "Croix"],
                  ["frame", "Cadre"],
                  ["arch", "Arche"],
                  ["circle", "Médaillon"],
                  ["wash", "Aquarelle"],
                  ["sprig", "Brin champêtre"],
                  ["diamond", "Losange"],
                ].map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {block.type !== "image" && (
          <div className="property-section compact-section">
            <label className="color-field">
              Couleur
              <input
                type="color"
                value={block.style.color}
                onChange={(e) => style({ color: e.target.value })}
              />
              <span>{block.style.color.toUpperCase()}</span>
            </label>
          </div>
        )}
        <div className="property-section">
          <h3>Position et dimensions · mm</h3>
          <div className="field-row">
            <NumberField
              label="X"
              value={block.x}
              onChange={(n) => onPatch({ x: n })}
            />
            <NumberField
              label="Y"
              value={block.y}
              onChange={(n) => onPatch({ y: n })}
            />
          </div>
          <div className="field-row">
            <NumberField
              label="Largeur"
              value={block.width}
              min={1}
              onChange={(n) =>
                onPatch(
                  block.type === "image"
                    ? { width: n, height: (n * block.height) / block.width }
                    : { width: n },
                )
              }
            />
            <NumberField
              label="Hauteur"
              value={block.height}
              min={1}
              onChange={(n) =>
                onPatch(
                  block.type === "image"
                    ? { height: n, width: (n * block.width) / block.height }
                    : { height: n },
                )
              }
            />
          </div>
          <NumberField
            label="Rotation · degrés"
            value={block.rotation}
            min={-360}
            max={360}
            step={1}
            onChange={(n) => onPatch({ rotation: n })}
          />
          <div className="alignment-buttons">
            <button
              onClick={() =>
                onPatch({ x: (doc.format.width - block.width) / 2 })
              }
            >
              <AlignHorizontalJustifyCenter size={15} />
              Centrer en largeur
            </button>
            <button
              onClick={() =>
                onPatch({ y: (doc.format.height - block.height) / 2 })
              }
            >
              <AlignVerticalJustifyCenter size={15} />
              Centrer en hauteur
            </button>
          </div>
        </div>
        <div className="property-section">
          <h3>Superposition</h3>
          <div className="layer-buttons">
            <button onClick={() => onLayer(false)}>
              <ArrowDown size={14} />À l’arrière
            </button>
            <button onClick={() => onLayer(true)}>
              <ArrowUp size={14} />À l’avant
            </button>
          </div>
        </div>
      </fieldset>
      <div className="property-actions">
        <button className="button secondary" onClick={onDuplicate}>
          <Copy size={15} />
          Dupliquer
        </button>
        <IconButton
          label="Supprimer l’élément"
          disabled={block.locked}
          onClick={onDelete}
        >
          <Trash2 size={17} />
        </IconButton>
      </div>
    </aside>
  );
}

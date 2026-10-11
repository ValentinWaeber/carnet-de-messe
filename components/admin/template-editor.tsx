"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  instantiateTemplate,
  templateMetadataSchema,
  type TemplateBundle,
  type TemplateMetadata,
} from "@/lib/catalog";
import { saveBundle, loadProject, getImages, blobDataUrl } from "@/lib/storage";
import { assetIds, type BookDocument } from "@/lib/document";
import EditorLoader from "../editor/editor-loader";
import { Modal, Notice } from "../ui";

export function TemplateEditor({
  templateId,
  userId,
}: {
  templateId: string;
  userId: string;
}) {
  const draftId = `admin-${userId}-${templateId}`;
  const storageKey = `template-draft-${draftId}`;
  const [metadata, setMetadata] = useState<TemplateMetadata | null>(null);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<BookDocument | null>(null);
  const [confirmReload, setConfirmReload] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const response = await fetch(`/api/templates/${templateId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Ce modèle est indisponible.");
      const bundle: TemplateBundle = await response.json();
      const existing = await loadProject(draftId);
      let saved: { metadata: TemplateMetadata; revision: number } | null = null;
      try {
        saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      } catch {
        /* Damaged draft information: retain published metadata. */
      }
      if (!existing || !saved) {
        const instance = instantiateTemplate(
          bundle,
          bundle.document.format,
          draftId,
        );
        await saveBundle(instance.doc, instance.images);
        saved = {
          metadata: {
            name: bundle.name,
            description: bundle.description,
            category: bundle.category,
          },
          revision: bundle.revision,
        };
        localStorage.setItem(storageKey, JSON.stringify(saved));
      }
      const parsed = templateMetadataSchema
        .extend({ name: z.string().max(100), description: z.string().max(300) })
        .safeParse(saved.metadata);
      if (
        !parsed.success ||
        !Number.isInteger(saved.revision) ||
        saved.revision < 1
      )
        throw new Error(
          "Le brouillon local est invalide. Ouvrez ce modèle dans un autre navigateur ou restaurez les données locales du brouillon.",
        );
      if (alive) {
        setMetadata(parsed.data);
        setRevision(saved.revision);
        setReady(true);
        if (saved.revision !== bundle.revision)
          setError(
            "La version publiée a changé depuis votre brouillon. Exportez-le si nécessaire, puis rechargez la version publiée avec le bouton ci-dessus.",
          );
      }
    })().catch((error) => {
      if (alive)
        setError(
          error instanceof Error ? error.message : "Ouverture impossible.",
        );
    });
    return () => {
      alive = false;
    };
  }, [templateId, draftId, storageKey]);
  function changeMetadata(patch: Partial<TemplateMetadata>) {
    if (!metadata) return;
    const next = { ...metadata, ...patch };
    setMetadata(next);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ metadata: next, revision }),
      );
    } catch {
      setError(
        "Les informations n’ont pas pu être sauvegardées sur cet appareil.",
      );
    }
  }
  async function publish() {
    if (!confirm || !metadata) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const wanted = new Set(assetIds(confirm));
      const images = await Promise.all(
        (await getImages(confirm))
          .filter((image) => wanted.has(image.id))
          .map(async (image) => ({
            id: image.id,
            name: image.name,
            mime: image.mime,
            width: image.width,
            height: image.height,
            data: await blobDataUrl(image.blob),
          })),
      );
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata, revision, document: confirm, images }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Publication impossible.");
      setRevision(result.revision);
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ metadata, revision: result.revision }),
        );
      } catch {
        setError(
          "Le modèle est publié, mais la version du brouillon n’a pas pu être enregistrée sur cet appareil. Rechargez la version publiée avant de continuer.",
        );
      }
      setNotice(
        `Le modèle a été publié (version ${result.revision}). Les prochains carnets utiliseront cette version.`,
      );
      setConfirm(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Publication impossible.",
      );
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-editor-shell">
      <div className="admin-model-bar">
        <Link className="text-button" href="/admin">
          <ArrowLeft size={15} />
          Collection
        </Link>
        <span className="admin-model-label">
          <ShieldCheck size={15} />
          BROUILLON DU MODÈLE · V{revision || "…"}
        </span>
        {metadata && (
          <>
            <label>
              Nom du modèle
              <input
                maxLength={100}
                value={metadata.name}
                onChange={(event) =>
                  changeMetadata({ name: event.target.value })
                }
              />
            </label>
            <label>
              Description
              <input
                maxLength={300}
                value={metadata.description}
                onChange={(event) =>
                  changeMetadata({ description: event.target.value })
                }
              />
            </label>
            <label>
              Collection
              <select
                value={metadata.category}
                onChange={(event) =>
                  changeMetadata({
                    category: event.target
                      .value as TemplateMetadata["category"],
                  })
                }
              >
                {["Intemporels", "Nature", "Modernes"].map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <button
          className="text-button"
          disabled={busy || !ready}
          onClick={() => setConfirmReload(true)}
        >
          Recharger la version publiée
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {notice && <Notice>{notice}</Notice>}
      {ready ? (
        <EditorLoader
          id={draftId}
          returnTo="/admin"
          publication={{
            busy: busy || !!confirm,
            onPublish: async (doc) => {
              const parsed = templateMetadataSchema.safeParse(metadata);
              if (!parsed.success) {
                setError("Indiquez un nom et une description pour le modèle.");
                return;
              }
              setConfirm(doc);
            },
          }}
        />
      ) : (
        !error && (
          <div className="loading-screen">Préparation du brouillon…</div>
        )
      )}
      {confirm && (
        <Modal
          title="Publier ce modèle ?"
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p>
            « {metadata?.name} » sera proposé à tous les visiteurs avec ces{" "}
            {confirm.pages.length} pages. Les carnets déjà créés sont conservés.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Continuer à modifier
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={publish}
            >
              {busy ? "Publication…" : "Confirmer la publication"}
            </button>
          </div>
        </Modal>
      )}
      <ReloadDialog
        open={confirmReload}
        busy={busy}
        onClose={() => setConfirmReload(false)}
        onConfirm={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch(`/api/templates/${templateId}`, {
              cache: "no-store",
            });
            if (!response.ok) throw new Error("Ce modèle est indisponible.");
            const bundle: TemplateBundle = await response.json();
            const instance = instantiateTemplate(
              bundle,
              bundle.document.format,
              draftId,
            );
            await saveBundle(instance.doc, instance.images);
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                metadata: {
                  name: bundle.name,
                  description: bundle.description,
                  category: bundle.category,
                },
                revision: bundle.revision,
              }),
            );
            window.location.reload();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Rechargement impossible.",
            );
            setBusy(false);
            setConfirmReload(false);
          }
        }}
      />
    </div>
  );
}
function ReloadDialog({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return open ? (
    <Modal
      title="Remplacer le brouillon local ?"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        Les modifications de ce brouillon seront remplacées par la version
        actuellement publiée. Exportez une copie avant de continuer si vous
        souhaitez les conserver.
      </p>
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Annuler
        </button>
        <button className="button primary" disabled={busy} onClick={onConfirm}>
          {busy ? "Chargement…" : "Remplacer le brouillon"}
        </button>
      </div>
    </Modal>
  ) : null;
}

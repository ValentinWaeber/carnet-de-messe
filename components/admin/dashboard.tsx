"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, RotateCcw, ShieldCheck } from "lucide-react";
import type { CatalogEntry } from "@/lib/catalog";
import { PagePreview } from "../page-preview";
import { Brand, Modal, Notice } from "../ui";
import { AccountMenu } from "../account-menu";

async function readCatalog() {
  const response = await fetch("/api/templates", { cache: "no-store" });
  if (!response.ok) throw new Error("La collection n’a pas pu être chargée.");
  return (await response.json()).templates as CatalogEntry[];
}

export function AdminDashboard({ name }: { name: string }) {
  const [templates, setTemplates] = useState<CatalogEntry[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reset, setReset] = useState<CatalogEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setTemplates(await readCatalog());
  }, []);
  useEffect(() => {
    let alive = true;
    readCatalog()
      .then((data) => {
        if (alive) setTemplates(data);
      })
      .catch((error) => {
        if (alive) setError(error.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <>
      <header className="site-header">
        <Brand />
        <nav>
          <Link className="text-button" href="/">
            <ArrowLeft size={16} />
            Le site
          </Link>
          <AccountMenu />
        </nav>
      </header>
      <main className="content-width admin-dashboard">
        <p className="eyebrow">
          <ShieldCheck size={15} /> ADMINISTRATION
        </p>
        <h1>
          Votre collection, <em>vos idées.</em>
        </h1>
        <p className="muted">
          Bonjour {name}. Modifiez les pages et les informations d’un modèle,
          puis publiez la nouvelle version.
        </p>
        <div className="admin-explainer">
          <strong>Des brouillons à votre rythme.</strong>
          <p>
            Les changements dans l’éditeur sont enregistrés sur cet appareil. La
            collection publique change lorsque vous cliquez sur « Publier le
            modèle ». Les carnets déjà créés conservent leur contenu.
          </p>
        </div>
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {!templates.length && !error && (
          <p role="status">Chargement de la collection…</p>
        )}
        <div className="admin-grid">
          {templates.map((template) => (
            <article className="admin-template-card" key={template.id}>
              <div className="admin-template-preview">
                <PagePreview
                  doc={template.document}
                  sources={template.sources}
                  width={145}
                />
              </div>
              <div className="admin-template-content">
                <span className="eyebrow">{template.category}</span>
                <h2>{template.name}</h2>
                <p>{template.description}</p>
                <small>
                  Version {template.revision} ·{" "}
                  {new Date(template.updatedAt).toLocaleDateString("fr-CH")}
                </small>
                <div className="admin-template-actions">
                  <Link
                    className="button primary small"
                    href={`/admin/modeles/${template.id}`}
                  >
                    <Pencil size={14} />
                    Modifier
                  </Link>
                  <button
                    className="text-button"
                    aria-label={`Restaurer le modèle ${template.name}`}
                    onClick={() => {
                      setError("");
                      setReset(template);
                    }}
                  >
                    <RotateCcw size={14} />
                    Restaurer
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {error && !templates.length && (
          <button
            className="button secondary"
            onClick={() => {
              setError("");
              void refresh().catch((error) => setError(error.message));
            }}
          >
            Réessayer
          </button>
        )}
      </main>
      {reset && (
        <Modal
          title="Restaurer le modèle d’origine ?"
          onClose={() => {
            if (!busy) setReset(null);
          }}
        >
          <p>
            Le modèle « {reset.name} » retrouvera ses pages et ses informations
            d’origine. Cette modification sera immédiatement visible dans la
            collection publique.
          </p>
          <p>Les carnets personnels déjà créés sont conservés.</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setReset(null)}
            >
              Annuler
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const response = await fetch(
                    `/api/admin/templates/${reset.id}`,
                    {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ revision: reset.revision }),
                    },
                  );
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error);
                  setReset(null);
                  await refresh();
                  setNotice("Le modèle d’origine a été restauré.");
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Restauration impossible.",
                  );
                  setReset(null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Restauration…" : "Restaurer et publier"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

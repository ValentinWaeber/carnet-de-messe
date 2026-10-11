"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Upload,
  FolderOpen,
  Copy,
  Pencil,
  Trash2,
  Leaf,
  Check,
  Download,
  BookOpen,
} from "lucide-react";
import {
  templates,
  createTemplateDocument,
  createBlankDocument,
} from "@/lib/templates";
import {
  listProjects,
  saveProject,
  cloneDocument,
  deleteProject,
  saveBundle,
  storageError,
} from "@/lib/storage";
import { importArchive } from "@/lib/archive";
import type { BookDocument } from "@/lib/document";
import { Brand, IconButton, Modal, Notice } from "./ui";
import { PagePreview } from "./page-preview";
import { FormatPicker } from "./format-picker";

const previews = templates.map((t) => createTemplateDocument(t.id));
export default function Home() {
  const router = useRouter();
  const [category, setCategory] = useState("Tous les modèles"),
    [chosen, setChosen] = useState<string | null>(null),
    [projects, setProjects] = useState<BookDocument[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [remove, setRemove] = useState<BookDocument | null>(null),
    [rename, setRename] = useState<BookDocument | null>(null),
    [newTitle, setNewTitle] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => setError(storageError(e)));
  }, []);
  const refresh = async () => setProjects(await listProjects());
  async function create(format: BookDocument["format"]) {
    setBusy(true);
    setError("");
    try {
      const doc =
        chosen === "blank"
          ? createBlankDocument(format)
          : createTemplateDocument(chosen!, format);
      await saveProject(doc);
      router.push(`/atelier/${doc.id}`);
    } catch (e) {
      setError(storageError(e));
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { doc, images } = await importArchive(file);
      await saveBundle(doc, images);
      router.push(`/atelier/${doc.id}`);
    } catch (e) {
      setError(storageError(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <header className="site-header">
        <Brand />
        <nav aria-label="Navigation principale">
          <a href="#modeles">Les modèles</a>
          <a href="#projets" className="projects-link">
            <FolderOpen size={16} />
            Mes carnets
            {projects.length > 0 && (
              <span className="count">{projects.length}</span>
            )}
          </a>
          <button
            className="button primary small"
            onClick={() =>
              document
                .getElementById("modeles")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Créer mon carnet
            <ArrowUpRight size={15} />
          </button>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> UN JOUR PRÉCIEUX. DES MOTS QUI RESTENT.
            </div>
            <h1>
              Votre histoire,
              <br />
              au fil <em>des pages.</em>
            </h1>
            <p>
              Composez un carnet de messe à votre image.
              <br className="desktop-break" /> Un bel écrin pour les mots, les
              chants et les moments qui vous rassemblent.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#modeles">
                Créer mon carnet
                <ArrowRight size={18} />
              </a>
              <button
                className="text-button"
                onClick={() => setChosen("blank")}
              >
                Partir d’une page blanche
                <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="hero-note">
              <Check size={14} /> Gratuit, sans compte · Votre travail reste sur
              cet appareil
            </div>
          </div>
          <div className="hero-art">
            <span className="hero-art-caption">
              UNE CÉLÉBRATION QUI VOUS RESSEMBLE
            </span>
            <div className="hero-book-back" />
            <div className="hero-book">
              <PagePreview doc={previews[3]} width={270} />
            </div>
            <div className="hero-swatch">
              <Leaf size={16} />
              <span>
                Botanique<small>L’élégance au naturel</small>
              </span>
            </div>
            <span className="hero-art-number">01 / 15</span>
          </div>
        </section>
        <section className="steps-strip" aria-label="Comment ça marche">
          <div>
            <span>01</span>
            <BookOpen size={19} />
            <p>Un modèle qui vous inspire</p>
          </div>
          <div>
            <span>02</span>
            <Pencil size={18} />
            <p>Vos mots, votre mise en page</p>
          </div>
          <div>
            <span>03</span>
            <Download size={19} />
            <p>Un PDF à garder et à imprimer</p>
          </div>
        </section>
        {error && (
          <div className="content-width">
            <Notice error>{error}</Notice>
          </div>
        )}
        <section className="gallery content-width" id="modeles">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LA COLLECTION</p>
              <h2>
                À chaque histoire, <em>son carnet.</em>
              </h2>
              <p className="muted">
                Quinze univers à personnaliser, jusque dans les petits détails.
              </p>
            </div>
            <span className="collection-number">
              15 MODÈLES · INFINIES POSSIBILITÉS
            </span>
          </div>
          <div className="gallery-toolbar">
            <div
              className="filter-tabs"
              role="group"
              aria-label="Filtrer les modèles"
            >
              {["Tous les modèles", "Intemporels", "Nature", "Modernes"].map(
                (c) => (
                  <button
                    key={c}
                    className={c === category ? "active" : ""}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
            <button className="text-button" onClick={() => setChosen("blank")}>
              <Plus size={16} />
              Carnet vierge
            </button>
          </div>
          <div className="template-grid">
            {templates.map(
              (t, i) =>
                (category === "Tous les modèles" ||
                  category === t.category) && (
                  <button
                    className="template-card"
                    key={t.id}
                    onClick={() => setChosen(t.id)}
                    aria-label={`Choisir le modèle ${t.name}`}
                  >
                    <div className={`template-stage stage-${i % 4}`}>
                      <div className="template-book">
                        <PagePreview doc={previews[i]} width={174} />
                      </div>
                      <span className="template-use">
                        Personnaliser
                        <ArrowUpRight size={15} />
                      </span>
                      {i === 3 && (
                        <span className="template-label">LE COUP DE CŒUR</span>
                      )}
                    </div>
                    <div className="template-caption">
                      <span>
                        <strong>{t.name}</strong>
                        <small>{t.description}</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </div>
                  </button>
                ),
            )}
          </div>
          <button className="blank-card" onClick={() => setChosen("blank")}>
            <span className="blank-icon">
              <Plus size={24} />
            </span>
            <span>
              <strong>Une page blanche, toutes vos idées.</strong>
              <small>Commencez librement, nous vous donnons les outils.</small>
            </span>
            <span className="text-button">
              Créer un carnet vierge
              <ArrowRight size={17} />
            </span>
          </button>
        </section>
        <section className="local-projects content-width" id="projets">
          <div className="section-heading">
            <div>
              <p className="eyebrow">VOTRE PETIT ATELIER</p>
              <h2>Mes carnets</h2>
              <p className="muted">
                Sauvegardés dans ce navigateur, sur cet appareil.
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => input.current?.click()}
              disabled={busy}
            >
              <Upload size={16} />
              {busy ? "Importation…" : "Importer un projet"}
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(e) => importFile(e.target.files?.[0])}
          />
          {projects.length === 0 ? (
            <div className="empty-projects">
              <FolderOpen size={27} strokeWidth={1.2} />
              <h3>Votre prochaine belle histoire commence ici.</h3>
              <p>
                Vos carnets apparaîtront ici dès leur création.
                <br />
                Vous pourrez les retrouver et les continuer à votre rythme.
              </p>
              <a className="text-button" href="#modeles">
                Choisir mon premier modèle
                <ArrowRight size={16} />
              </a>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((doc) => (
                <article className="project-card" key={doc.id}>
                  <button
                    className="project-open"
                    onClick={() => router.push(`/atelier/${doc.id}`)}
                  >
                    <span className="project-monogram">
                      <BookOpen size={23} />
                    </span>
                    <span>
                      <strong>{doc.title}</strong>
                      <small>
                        {doc.pages.length} pages · {doc.format.width} ×{" "}
                        {doc.format.height} mm
                        <br />
                        Modifié le{" "}
                        {new Intl.DateTimeFormat("fr-CH", {
                          dateStyle: "medium",
                          timeZone: "Europe/Zurich",
                        }).format(new Date(doc.updatedAt))}
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                  <div className="project-actions">
                    <IconButton
                      label={`Renommer ${doc.title}`}
                      onClick={() => {
                        setRename(doc);
                        setNewTitle(doc.title);
                      }}
                    >
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      label={`Dupliquer ${doc.title}`}
                      onClick={async () => {
                        try {
                          await saveProject(cloneDocument(doc));
                          await refresh();
                        } catch (e) {
                          setError(storageError(e));
                        }
                      }}
                    >
                      <Copy size={15} />
                    </IconButton>
                    <IconButton
                      label={`Supprimer ${doc.title}`}
                      onClick={() => setRemove(doc)}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="storage-note">
            Pensez à exporter une copie de votre projet : l’effacement des
            données du navigateur supprime les carnets locaux.
          </p>
        </section>
      </main>
      <footer className="site-footer">
        <Brand compact />
        <span>Fait pour les instants qui comptent.</span>
        <small>Un atelier local, sans compte ni abonnement.</small>
      </footer>
      {chosen && (
        <FormatPicker
          onClose={() => setChosen(null)}
          onConfirm={create}
          busy={busy}
        />
      )}
      {remove && (
        <Modal title="Supprimer ce carnet ?" onClose={() => setRemove(null)}>
          <p>
            « {remove.title} » sera supprimé de cet appareil. Cette action est
            définitive. Exportez-le auparavant si vous souhaitez le conserver.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setRemove(null)}
            >
              Conserver
            </button>
            <button
              className="button danger"
              onClick={async () => {
                try {
                  await deleteProject(remove.id);
                  setRemove(null);
                  await refresh();
                } catch (e) {
                  setError(storageError(e));
                }
              }}
            >
              Supprimer le carnet
            </button>
          </div>
        </Modal>
      )}
      {rename && (
        <Modal title="Renommer le carnet" onClose={() => setRename(null)}>
          <label>
            Nom du projet
            <input
              autoFocus
              maxLength={150}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={!newTitle.trim()}
              onClick={async () => {
                try {
                  await saveProject({
                    ...rename,
                    title: newTitle.trim(),
                    updatedAt: new Date().toISOString(),
                  });
                  setRename(null);
                  await refresh();
                } catch (e) {
                  setError(storageError(e));
                }
              }}
            >
              Enregistrer
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

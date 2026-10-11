"use client";
import { useEffect, useRef, useState } from "react";
import { PageFlip } from "page-flip";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { mmToPx, type BookDocument, type AssetSources } from "@/lib/document";
import { pageHtml } from "@/lib/render";
import { PagePreview } from "./page-preview";
import { IconButton } from "./ui";

/** All StPageFlip integration is isolated here. Editor interactions never reach this engine. */
export function BookPreview({
  doc,
  sources,
  onClose,
}: {
  doc: BookDocument;
  sources: AssetSources;
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<PageFlip | null>(null);
  const lastIndex = useRef(0);
  const [index, setIndex] = useState(0),
    [reduced, setReduced] = useState(false),
    [size, setSize] = useState({
      width: 290,
      height: (290 * doc.format.height) / doc.format.width,
      spread: true,
    });
  useEffect(() => {
    const dialog = host.current?.closest<HTMLElement>(".preview-overlay");
    dialog?.focus();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      const w = Math.min(
        420,
        (window.innerWidth - 48) / (window.innerWidth < 650 ? 1 : 2),
        ((window.innerHeight - 195) * doc.format.width) / doc.format.height,
      );
      setSize({
        width: w,
        height: (w * doc.format.height) / doc.format.width,
        spread: window.innerWidth >= 650,
      });
      setReduced(media.matches);
    };
    resize();
    window.addEventListener("resize", resize);
    media.addEventListener("change", resize);
    return () => {
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", resize);
    };
  }, [doc.format]);
  useEffect(() => {
    if (!host.current || reduced) return;
    // StPageFlip.destroy() removes its root from the DOM. Give it a child it owns,
    // so resizing and React Strict Mode cannot remove React's host element.
    const outer = host.current;
    outer.replaceChildren();
    const root = document.createElement("div");
    outer.appendChild(root);
    const physicalWidth = mmToPx(doc.format.width),
      scale = size.width / physicalWidth;
    const pages = [...doc.pages];
    // An odd page count needs a blank interior before the real back cover.
    if (pages.length % 2 !== 0)
      pages.splice(pages.length - 1, 0, {
        id: "preview-blank",
        background: doc.pages.at(-2)?.background ?? doc.theme.paper,
        blocks: [],
      });
    for (let i = 0; i < pages.length; i++) {
      const node = document.createElement("div");
      node.className = "flip-page";
      node.dataset.density =
        i === 0 || i === pages.length - 1 ? "hard" : "soft";
      node.innerHTML = `<div style="width:${physicalWidth}px;height:${mmToPx(doc.format.height)}px;transform:scale(${scale});transform-origin:top left">${pageHtml(pages[i], doc, sources)}</div>`;
      root.appendChild(node);
    }
    const flip = new PageFlip(root, {
      width: size.width,
      height: size.height,
      size: "fixed",
      showCover: true,
      usePortrait: true,
      drawShadow: true,
      maxShadowOpacity: 0.16,
      flippingTime: 700,
      mobileScrollSupport: false,
      showPageCorners: true,
      useMouseEvents: true,
      clickEventForward: false,
      startPage: Math.min(lastIndex.current, pages.length - 1),
    });
    flip.loadFromHTML(root.querySelectorAll<HTMLElement>(".flip-page"));
    flip.on("flip", (e) => {
      lastIndex.current = Number(e.data);
      setIndex(Number(e.data));
    });
    engine.current = flip;
    return () => {
      flip.destroy();
      engine.current = null;
    };
  }, [doc, sources, size, reduced]);
  const total = doc.pages.length + (doc.pages.length % 2),
    last = reduced ? doc.pages.length - 1 : total - 1;
  const navigate = (delta: number) => {
    if (reduced)
      setIndex((i) => {
        const next = Math.min(last, Math.max(0, i + delta));
        lastIndex.current = next;
        return next;
      });
    else if (delta < 0) engine.current?.flipPrev();
    else engine.current?.flipNext();
  };
  return (
    <div
      className="preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu du carnet"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowLeft") navigate(-1);
        if (e.key === "ArrowRight") navigate(1);
        if (e.key === "Tab") {
          const controls = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const first = controls[0],
            last = controls.at(-1);
          if (document.activeElement === e.currentTarget) {
            e.preventDefault();
            (e.shiftKey ? last : first)?.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <header>
        <div>
          <p className="eyebrow">PRENEZ LE TEMPS DE FEUILLETER</p>
          <h2>{doc.title}</h2>
        </div>
        <IconButton label="Fermer l’aperçu" onClick={onClose}>
          <X size={24} />
        </IconButton>
      </header>
      <div className="preview-book-area">
        {reduced ? (
          <PagePreview
            doc={doc}
            page={doc.pages[Math.min(index, doc.pages.length - 1)]}
            width={size.width}
            sources={sources}
          />
        ) : null}
        <div
          ref={host}
          className="flip-host"
          style={{
            display: reduced ? "none" : undefined,
            width: Math.ceil(size.width * (size.spread ? 2 : 1)),
            height: Math.ceil(size.height),
          }}
        />
      </div>
      <div className="preview-controls">
        <IconButton
          label="Page précédente"
          disabled={index === 0}
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={22} />
        </IconButton>
        <span>
          {index === 0
            ? "Première de couverture"
            : index >= last
              ? "Dernière de couverture"
              : `Page ${index + 1} / ${total}`}
        </span>
        <IconButton
          label="Page suivante"
          disabled={index >= last}
          onClick={() => navigate(1)}
        >
          <ChevronRight size={22} />
        </IconButton>
      </div>
      <p className="preview-hint">
        {reduced
          ? "Animation désactivée selon les préférences de votre appareil."
          : "Tournez les pages par leurs coins, avec les flèches ou au toucher."}
      </p>
    </div>
  );
}

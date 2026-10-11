"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";
import Moveable from "react-moveable";
import {
  mmToPx,
  pxToMm,
  type Block,
  type BookDocument,
  type DocumentPage,
  type AssetSources,
} from "@/lib/document";
import { blockStyle, blockContentHtml } from "@/lib/render";

export function EditablePage({
  doc,
  page,
  sources,
  scale,
  selected,
  onSelect,
  onEdit,
  onChange,
  onDropBlock,
  guides,
  onOverflow,
}: {
  doc: BookDocument;
  page: DocumentPage;
  sources: AssetSources;
  scale: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  onChange: (id: string, patch: Partial<Block>) => void;
  onDropBlock: (type: Block["type"], x: number, y: number) => void;
  guides: boolean;
  onOverflow: (pageId: string, ids: string[]) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    moveable = useRef<Moveable>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const current = page.blocks.find((b) => b.id === selected);
  const draft = useRef<Partial<Block>>({});
  const markup = page.blocks
    .map(
      (b) =>
        `<div data-block-id="${b.id}" class="document-block ${b.locked ? "locked" : ""} ${b.id === selected ? "is-selected" : ""}" style="${blockStyle(b)}">${blockContentHtml(b, sources)}</div>`,
    )
    .join("");
  useEffect(() => {
    const element =
      container.current?.querySelector<HTMLElement>(
        `[data-block-id="${selected}"]`,
      ) ?? null;
    // Moveable needs the new HTML target after each document render.
    queueMicrotask(() => setTarget(element));
    requestAnimationFrame(() => moveable.current?.updateRect());
    const inspect = () => {
      const ids = Array.from(
        container.current?.querySelectorAll<HTMLElement>(".block-text") ?? [],
      )
        .filter(
          (el) =>
            el.scrollHeight > el.clientHeight + 2 ||
            el.scrollWidth > el.clientWidth + 2,
        )
        .map((el) => el.parentElement!.dataset.blockId!);
      onOverflow(page.id, ids);
    };
    const timer = setTimeout(inspect, 100);
    return () => clearTimeout(timer);
  }, [markup, selected, scale, page.id, onOverflow]);
  function drop(e: DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData(
      "application/x-carnet-block",
    ) as Block["type"];
    if (
      ![
        "title",
        "paragraph",
        "reading",
        "song",
        "image",
        "line",
        "decoration",
      ].includes(type)
    )
      return;
    const rect = container.current!.getBoundingClientRect();
    onDropBlock(
      type,
      (e.clientX - rect.left) / (mmToPx(1) * scale),
      (e.clientY - rect.top) / (mmToPx(1) * scale),
    );
  }
  const end = () => {
    if (current && Object.keys(draft.current).length) {
      onChange(current.id, draft.current);
      draft.current = {};
    }
  };
  return (
    <div
      className="editable-page-frame"
      style={{
        width: mmToPx(doc.format.width) * scale,
        height: mmToPx(doc.format.height) * scale,
      }}
    >
      <div
        className="editable-page-scaled"
        style={{
          transform: `scale(${scale})`,
          width: mmToPx(doc.format.width),
          height: mmToPx(doc.format.height),
        }}
      >
        <div
          ref={container}
          className="document-page editable-document"
          style={{
            width: `${doc.format.width}mm`,
            height: `${doc.format.height}mm`,
            background: page.background,
          }}
          onClick={(e) => {
            const b = (e.target as HTMLElement).closest<HTMLElement>(
              "[data-block-id]",
            );
            onSelect(b?.dataset.blockId ?? null);
          }}
          onDoubleClick={(e) => {
            const b = (e.target as HTMLElement).closest<HTMLElement>(
              "[data-block-id]",
            );
            if (b) onEdit(b.dataset.blockId!);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={drop}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
        {guides && (
          <div
            className="page-margin-guide"
            style={{
              top: `${doc.margins.top}mm`,
              right: `${doc.margins.right}mm`,
              bottom: `${doc.margins.bottom}mm`,
              left: `${doc.margins.left}mm`,
            }}
          />
        )}
        <Moveable
          ref={moveable}
          target={current && !current.locked ? target : null}
          draggable
          resizable
          rotatable
          origin={false}
          zoom={1 / scale}
          snappable
          snapThreshold={5}
          verticalGuidelines={[
            0,
            mmToPx(doc.margins.left),
            mmToPx(doc.format.width / 2),
            mmToPx(doc.format.width - doc.margins.right),
            mmToPx(doc.format.width),
          ]}
          horizontalGuidelines={[
            0,
            mmToPx(doc.margins.top),
            mmToPx(doc.format.height / 2),
            mmToPx(doc.format.height - doc.margins.bottom),
            mmToPx(doc.format.height),
          ]}
          keepRatio={current?.type === "image"}
          throttleDrag={0}
          throttleResize={0}
          onDragStart={() => {
            draft.current = {};
          }}
          onDrag={({ target, beforeDist }) => {
            if (!current) return;
            const x = current.x + pxToMm(beforeDist[0]),
              y = current.y + pxToMm(beforeDist[1]);
            target.style.left = `${x}mm`;
            target.style.top = `${y}mm`;
            draft.current = { x, y };
          }}
          onDragEnd={end}
          onResizeStart={({ set, setMin, setMax }) => {
            // Moveable parses inline CSS dimensions as pixels, while our document
            // deliberately uses mm. Supply the true CSS-pixel sizes explicitly.
            if (current) set([mmToPx(current.width), mmToPx(current.height)]);
            setMin([mmToPx(1), mmToPx(1)]);
            setMax([mmToPx(800), mmToPx(800)]);
            draft.current = {};
          }}
          onResize={({ target, width, height, drag }) => {
            if (!current) return;
            const patch = {
              width: Math.max(1, pxToMm(width)),
              height: Math.max(1, pxToMm(height)),
              x: current.x + pxToMm(drag.beforeDist[0]),
              y: current.y + pxToMm(drag.beforeDist[1]),
            };
            target.style.width = `${patch.width}mm`;
            target.style.height = `${patch.height}mm`;
            target.style.left = `${patch.x}mm`;
            target.style.top = `${patch.y}mm`;
            draft.current = patch;
          }}
          onResizeEnd={end}
          onRotateStart={({ set }) => {
            set(current?.rotation ?? 0);
            draft.current = {};
          }}
          onRotate={({ target, beforeRotate }) => {
            target.style.transform = `rotate(${beforeRotate}deg)`;
            draft.current = {
              rotation: Math.max(-360, Math.min(360, beforeRotate)),
            };
          }}
          onRotateEnd={end}
        />
      </div>
    </div>
  );
}

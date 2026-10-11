"use client";
import dynamic from "next/dynamic";
import type { EditorPublication } from "./editor";
const Editor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">Ouverture de votre atelier…</div>
  ),
});
export default function EditorLoader({
  id,
  publication,
  returnTo,
}: {
  id: string;
  publication?: EditorPublication;
  returnTo?: string;
}) {
  return (
    <Editor key={id} id={id} publication={publication} returnTo={returnTo} />
  );
}

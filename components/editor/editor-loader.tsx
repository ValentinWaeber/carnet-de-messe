"use client";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">Ouverture de votre atelier…</div>
  ),
});
export default function EditorLoader({ id }: { id: string }) {
  return <Editor key={id} id={id} />;
}

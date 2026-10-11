import { Suspense } from "react";
import EditorLoader from "@/components/editor/editor-loader";
async function OpenEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorLoader id={id} />;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">Ouverture de votre carnet…</div>
      }
    >
      <OpenEditor params={params} />
    </Suspense>
  );
}

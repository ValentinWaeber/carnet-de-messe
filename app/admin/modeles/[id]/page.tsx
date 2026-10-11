import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { getTemplate } from "@/lib/server/templates";
import { TemplateEditor } from "@/components/admin/template-editor";
async function OpenTemplate({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!getTemplate(id)) notFound();
  return <TemplateEditor templateId={id} userId={user.id} />;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={<div className="loading-screen">Ouverture du modèle…</div>}
    >
      <OpenTemplate params={params} />
    </Suspense>
  );
}

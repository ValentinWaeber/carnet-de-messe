import { Suspense } from "react";
import { requireAdmin } from "@/lib/server/admin";
import { AdminDashboard } from "@/components/admin/dashboard";
export const metadata = { title: "Administration · Maison du carnet" };
async function Dashboard() {
  const user = await requireAdmin();
  return <AdminDashboard name={user.name} />;
}
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">Vérification de votre accès…</div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}

import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Connexion · Maison du carnet" };
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">Ouverture de votre espace…</div>
      }
    >
      <AuthForm
        localMail={
          process.env.NODE_ENV === "development" &&
          process.env.MAIL_MODE === "local"
        }
      />
    </Suspense>
  );
}

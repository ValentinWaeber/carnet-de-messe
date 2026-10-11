import type { Metadata } from "next";
import "./globals.css";
import { DOCUMENT_CSS } from "@/lib/render";

export const metadata: Metadata = {
  title: "Maison du carnet — Votre carnet de messe",
  description:
    "Un bel écrin pour votre célébration. Choisissez un modèle, composez votre carnet de messe et téléchargez-le en PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>
        <style>{DOCUMENT_CSS}</style>
        {children}
      </body>
    </html>
  );
}

import Link from "next/link";
import { Brand } from "@/components/ui";
export default function Page() {
  return (
    <main className="auth-denied">
      <Brand />
      <h1>Cet espace est réservé.</h1>
      <p>Votre compte ne possède pas les droits administrateur.</p>
      <Link className="button primary" href="/">
        Retour à l’accueil
      </Link>
    </main>
  );
}

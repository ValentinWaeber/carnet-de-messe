"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  admin: boolean;
};
export function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      fetch("/api/account", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data) => {
          if (alive) setUser(data.user);
        })
        .catch(() => {});
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);
  if (!user)
    return (
      <Link className="account-link" href="/connexion">
        <LogIn size={16} />
        Connexion
      </Link>
    );
  return (
    <div className="account-menu">
      {user.admin && (
        <Link className="account-link" href="/admin">
          <ShieldCheck size={16} />
          Administration
        </Link>
      )}
      <span className="account-name" title={user.email}>
        {user.name}
      </span>
      <button
        className="icon-button"
        aria-label="Se déconnecter"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error();
            setUser(null);
            router.replace("/");
            router.refresh();
          } catch {
            setError("Déconnexion impossible. Réessayez.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <LogOut size={16} />
      </button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

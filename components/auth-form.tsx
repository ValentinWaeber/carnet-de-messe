"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Brand, Notice } from "./ui";
import type { AccountUser } from "./account-menu";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";
const errorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD:
    "L’adresse e-mail ou le mot de passe est incorrect.",
  EMAIL_NOT_VERIFIED: "Confirmez votre adresse e-mail avant de vous connecter.",
  PASSWORD_TOO_SHORT: "Choisissez un mot de passe d’au moins 12 caractères.",
  PASSWORD_TOO_LONG: "Le mot de passe ne doit pas dépasser 128 caractères.",
  INVALID_TOKEN:
    "Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel e-mail.",
  TOKEN_EXPIRED: "Ce lien a expiré. Demandez un nouvel e-mail.",
  TOO_MANY_REQUESTS:
    "Trop de tentatives. Patientez une minute avant de réessayer.",
  SERVICE_UNAVAILABLE:
    "Le service est indisponible. Réessayez dans un instant.",
};
export function AuthForm({ localMail }: { localMail: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [mode, setMode] = useState<Mode>(
    params.get("token") ? "reset" : "login",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    params.get("error")
      ? "Ce lien de validation a expiré ou est invalide. Demandez un nouvel e-mail."
      : "",
  );
  const [notice, setNotice] = useState(
    params.get("verified")
      ? "Votre adresse e-mail est confirmée. Vous pouvez vous connecter."
      : "",
  );
  const [user, setUser] = useState<AccountUser | null>(null);
  useEffect(() => {
    if (token) return;
    let alive = true;
    fetch("/api/account", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive) setUser(data?.user || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);
  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmation("");
  }
  function check(result: { error: { code?: string; status?: number } | null }) {
    if (result.error)
      throw new Error(
        result.error.status === 429
          ? errorMessages.TOO_MANY_REQUESTS
          : errorMessages[result.error.code || ""] ||
              "Impossible de terminer cette demande. Réessayez dans un instant.",
      );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (
        (mode === "register" || mode === "reset") &&
        password !== confirmation
      )
        throw new Error("Les deux mots de passe doivent être identiques.");
      if (mode === "register") {
        check(
          await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
            callbackURL: "/connexion?verified=1",
          }),
        );
        setPassword("");
        setConfirmation("");
        setMode("verify");
        setNotice(
          "Un e-mail de validation vous attend. Cliquez sur son lien, puis connectez-vous.",
        );
      } else if (mode === "login") {
        check(await authClient.signIn.email({ email: email.trim(), password }));
        const response = await fetch("/api/account", { cache: "no-store" });
        if (!response.ok)
          throw new Error("Impossible de charger votre compte. Réessayez.");
        const data = await response.json();
        if (!data.user)
          throw new Error("Votre session n’a pas pu être ouverte.");
        router.replace(data.user.admin ? "/admin" : "/");
        router.refresh();
      } else if (mode === "verify") {
        check(
          await authClient.sendVerificationEmail({
            email: email.trim(),
            callbackURL: "/connexion?verified=1",
          }),
        );
        setNotice(
          "Si cette adresse possède un compte à confirmer, un nouveau lien de validation vient d’être envoyé.",
        );
      } else if (mode === "forgot") {
        check(
          await authClient.requestPasswordReset({
            email: email.trim(),
            redirectTo: "/connexion",
          }),
        );
        setNotice(
          "Si cette adresse possède un compte, vous recevrez un lien pour choisir un nouveau mot de passe.",
        );
      } else {
        check(
          await authClient.resetPassword({
            newPassword: password,
            token: params.get("token") || "",
          }),
        );
        setPassword("");
        setConfirmation("");
        setMode("login");
        setNotice(
          "Votre mot de passe a été modifié. Connectez-vous avec le nouveau mot de passe.",
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "La demande n’a pas abouti. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }
  const headings = {
    login: "Heureux de vous retrouver.",
    register: "Bienvenue dans votre atelier.",
    verify: "Un petit signe dans votre boîte mail.",
    forgot: "Retrouvons votre accès.",
    reset: "Un nouveau départ.",
  };
  return (
    <div className="auth-page">
      <header className="site-header">
        <Brand />
        <Link className="text-button" href="/">
          <ArrowLeft size={16} />
          Retour à l’accueil
        </Link>
      </header>
      <main className="auth-layout">
        <aside className="auth-aside">
          <span className="eyebrow">MAISON DU CARNET</span>
          <h1>
            Les belles histoires
            <br />
            se préparent <em>ici.</em>
          </h1>
          <p>
            Un compte pour vous retrouver, un atelier pour donner forme aux mots
            qui comptent.
          </p>
          <div className="auth-aside-note">
            <ShieldCheck size={20} />
            <span>
              Votre adresse est vérifiée avant toute connexion. L’administration
              est réservée aux personnes autorisées.
            </span>
          </div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">
            {user
              ? "VOTRE COMPTE"
              : mode === "register"
                ? "CRÉER UN COMPTE"
                : "VOTRE ESPACE"}
          </span>
          <h2>{user ? `Bonjour ${user.name}.` : headings[mode]}</h2>
          {user ? (
            <>
              <p className="muted">{user.email} · Adresse vérifiée</p>
              <Link
                className="button primary"
                href={user.admin ? "/admin" : "/"}
              >
                {user.admin
                  ? "Ouvrir l’administration"
                  : "Retrouver mon atelier"}
                <ArrowRight size={16} />
              </Link>
              <button
                className="text-button"
                onClick={async () => {
                  const result = await authClient.signOut();
                  if (result.error)
                    setError("Déconnexion impossible. Réessayez.");
                  else {
                    setUser(null);
                    router.replace("/connexion");
                    router.refresh();
                  }
                }}
              >
                Se déconnecter
              </button>
              {error && <Notice error>{error}</Notice>}
            </>
          ) : (
            <>
              <p className="muted">
                {mode === "register"
                  ? "Choisissez vos identifiants. Nous vous enverrons un lien pour confirmer votre adresse."
                  : mode === "login"
                    ? "Connectez-vous avec votre adresse e-mail vérifiée."
                    : mode === "reset"
                      ? "Choisissez un mot de passe d’au moins 12 caractères."
                      : "Indiquez votre adresse pour recevoir un nouveau lien."}
              </p>
              {notice && <Notice>{notice}</Notice>}
              {error && <Notice error>{error}</Notice>}
              <form onSubmit={submit} className="auth-form">
                {mode === "register" && (
                  <label>
                    Votre prénom
                    <input
                      autoComplete="given-name"
                      maxLength={80}
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                )}
                {mode !== "reset" && (
                  <label>
                    Adresse e-mail
                    <input
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                )}
                {(mode === "login" ||
                  mode === "register" ||
                  mode === "reset") && (
                  <label>
                    Mot de passe
                    <input
                      aria-label="Mot de passe"
                      type="password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      minLength={mode === "login" ? undefined : 12}
                      maxLength={128}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {mode !== "login" && (
                      <small>
                        Au moins 12 caractères ; une phrase facile à retenir
                        convient très bien.
                      </small>
                    )}
                  </label>
                )}
                {(mode === "register" || mode === "reset") && (
                  <label>
                    Confirmer le mot de passe
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                )}
                {mode === "login" && (
                  <button
                    type="button"
                    className="text-button auth-forgot"
                    onClick={() => changeMode("forgot")}
                  >
                    Mot de passe oublié ?
                  </button>
                )}
                <button className="button primary" disabled={busy}>
                  {busy
                    ? "Un instant…"
                    : mode === "register"
                      ? "Créer mon compte"
                      : mode === "login"
                        ? "Se connecter"
                        : mode === "reset"
                          ? "Enregistrer le mot de passe"
                          : "Envoyer le lien"}
                  <ArrowRight size={16} />
                </button>
              </form>
              <div className="auth-switch">
                {mode === "login" ? (
                  <>
                    Vous nous rejoignez ?{" "}
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => changeMode("register")}
                    >
                      Créer un compte
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => changeMode("verify")}
                    >
                      Renvoyer l’e-mail de validation
                    </button>
                  </>
                ) : (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => changeMode("login")}
                  >
                    J’ai déjà un compte · Me connecter
                  </button>
                )}
              </div>
              {localMail && (
                <div className="dev-mail-note">
                  <Mail size={17} />
                  <span>
                    Les e-mails de test restent sur cet ordinateur. Ouvrez la
                    boîte locale avec <code>npm run mail:dev</code>, puis
                    cliquez sur le lien affiché.
                  </span>
                </div>
              )}
            </>
          )}
          <p className="auth-local-note">
            Vos carnets personnels restent sauvegardés dans ce navigateur. Le
            compte ne les synchronise pas encore entre appareils.
          </p>
        </section>
      </main>
    </div>
  );
}

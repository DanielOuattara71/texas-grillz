/**
 * Ecran de connexion.
 *
 * Le mot de passe n'est jamais stocke ni memorise par le navigateur : il part
 * vers le serveur qui le compare au hash bcrypt, et le serveur repond avec un
 * cookie de session. C'est ce qui distingue cette page d'un simple champ
 * decoratif pose sur un site statique.
 */
import { useState, type FormEvent } from "react";
import { useSession } from "./SessionContext";
import { isApiConfigured } from "./config";
import { ApiError } from "./api";
import { ActionButton, Field, Notice, TextInput } from "./ui";

export function LoginScreen() {
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      // Le mot de passe disparait de l'etat React immediatement.
      setPassword("");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Connexion impossible. Reessayez dans un instant."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-charcoal px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/logo.jpg"
            alt="Texas GrillZ"
            className="mx-auto mb-5 h-16 w-16 rounded-full object-cover"
          />
          <h1 className="font-display text-2xl text-cream">
            Espace <span className="font-serif italic text-gold">administration</span>
          </h1>
          <p className="mt-2 text-sm text-smoke">
            Reserve au personnel Texas GrillZ.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-card border border-cream/10 bg-black/25 p-7 shadow-2xl shadow-black/40"
        >
          {!isApiConfigured && (
            <div className="mb-5">
              <Notice tone="error">
                Adresse de l&apos;API non configuree. Definissez{" "}
                <code className="font-mono text-xs">VITE_API_URL</code> a la
                construction, ou lancez le serveur en local.
              </Notice>
            </div>
          )}

          {error && (
            <div className="mb-5">
              <Notice tone="error">{error}</Notice>
            </div>
          )}

          <div className="space-y-5">
            <Field label="Adresse email">
              <TextInput
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@texas-grillz.fr"
              />
            </Field>

            <Field label="Mot de passe">
              <TextInput
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </Field>
          </div>

          <ActionButton
            type="submit"
            tone="primary"
            className="mt-7 w-full justify-center"
            disabled={busy || !isApiConfigured}
          >
            {busy ? "Connexion…" : "Se connecter"}
          </ActionButton>

          <p className="mt-6 text-center text-xs text-ash">
            10 tentatives maximum par quart d&apos;heure et par adresse IP.
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-ash">
          <a href="/" className="transition-colors hover:text-gold">
            Retour au site
          </a>
        </p>
      </div>
    </main>
  );
}

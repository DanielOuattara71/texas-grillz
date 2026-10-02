/**
 * Ecran « mon compte » : changer le mot de passe de l'administrateur.
 *
 * Le serveur ferme toutes les sessions lors d'un changement : c'est la seule
 * facon de reprendre la main si un acces a ete compromis.
 */
import { useState, type FormEvent } from "react";
import { api, ApiError } from "./api";
import { ActionButton, Card, Field, Notice, TextInput } from "./ui";

export function AccountScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.changePassword(currentPassword, newPassword);
      setMessage({
        tone: "success",
        text: "Mot de passe modifie. Vos autres sessions ont ete fermees ; reconnectez-vous.",
      });
      setCurrentPassword("");
      setNewPassword("");
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Modification impossible.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Mot de passe"
        description="Douze caracteres minimum. Le changement ferme vos autres sessions ouvertes."
      >
        <form onSubmit={onSubmit} className="max-w-md space-y-4">
          <Field label="Mot de passe actuel">
            <TextInput
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>

          <Field label="Nouveau mot de passe">
            <TextInput
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>

          {message && <Notice tone={message.tone}>{message.text}</Notice>}

          <ActionButton type="submit" tone="primary" disabled={busy}>
            {busy ? "Modification…" : "Changer le mot de passe"}
          </ActionButton>
        </form>
      </Card>
    </div>
  );
}

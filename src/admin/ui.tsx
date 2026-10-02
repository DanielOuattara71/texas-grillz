/**
 * Petits composants partages par tous les ecrans d'administration.
 *
 * L'admin reprend les couleurs du site (charbon, creme, or, rouge signal) pour
 * que la bascule depuis le site public ne soit pas brutale.
 */
import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function Card({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-cream/10 bg-charcoal p-6 shadow-xl shadow-black/20",
        className
      )}
    >
      {(title || action) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            {title && <h2 className="font-display text-lg text-cream">{title}</h2>}
            {description && <p className="mt-1 text-sm text-smoke">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const fieldBase =
  "w-full rounded-card border border-cream/15 bg-black/25 px-3 py-2.5 text-cream placeholder:text-ash focus:border-gold focus:outline-none";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ash">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, "resize-y", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldBase, props.className)} />;
}

type ButtonTone = "primary" | "ghost" | "danger";

const tones: Record<ButtonTone, string> = {
  primary: "bg-gold text-coal hover:bg-gold-pale",
  ghost: "border border-cream/20 text-cream hover:border-gold hover:text-gold",
  danger: "border border-signal-bright/50 text-signal-bright hover:bg-signal-bright hover:text-coal",
};

export function ActionButton({
  tone = "ghost",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-card px-4 py-2 font-display text-[11px] uppercase tracking-[0.14em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        tones[tone],
        className
      )}
    />
  );
}

/** Bandeau d'information / d'erreur, lisible sans dependre de la couleur. */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error";
  children: ReactNode;
}) {
  // `success` s'appuie sur le jaune de securite du site (--color-caution) et
  // non sur une couleur par defaut de Tailwind : la palette reste fermee.
  const styles = {
    info: "border-cream/15 bg-cream/5 text-smoke",
    success: "border-caution/40 bg-caution/10 text-caution",
    error: "border-signal-bright/40 bg-signal-bright/10 text-signal-bright",
  }[tone];

  return (
    <p role="status" className={cn("rounded-card border px-4 py-3 text-sm", styles)}>
      {children}
    </p>
  );
}

/** Champ de formulaire unique reutilise par tous les ecrans d'edition. */
export function AdminButtonRow({
  onSave,
  onRevert,
  saving,
  dirty,
}: {
  onSave: () => void;
  onRevert?: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton tone="primary" onClick={onSave} disabled={!dirty || saving}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </ActionButton>
      {onRevert && (
        <ActionButton onClick={onRevert} disabled={!dirty || saving}>
          Annuler les modifications
        </ActionButton>
      )}
      <span className="text-xs text-ash">
        {saving ? "Enregistrement en cours…" : dirty ? "Modifications non enregistrees" : "A jour"}
      </span>
    </div>
  );
}

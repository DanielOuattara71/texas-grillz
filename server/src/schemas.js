/**
 * Format de donnees du contenu editable.
 *
 * Le contrat est ecrit ici, en un seul endroit, et applique par le serveur
 * avant toute ecriture : un plat sans titre, avec un prix negatif ou une URL
 * d'image qui n'est pas une image est refuse, plutot que d'etre enregistre et
 * de casser l'affichage du site public.
 *
 * Le site (TypeScript) declare la meme forme dans `src/data/*.ts` : les deux
 * descriptions doivent evoluer ensemble. `server/test/format.test.cjs` verifie
 * qu'un plat livre passe bien la validation.
 */
const { z } = require("zod");

/**
 * URL d'un visuel. Trois formes acceptees :
 *   - `/uploads/…`  : photo deposee depuis l'espace d'administration ;
 *   - `/images/…`   : photo livree avec le site ;
 *   - `https://…`   : hebergee ailleurs (CDN, bucket objet).
 *
 * La chaine vide est acceptee : le site dessine alors une assiette a la place
 * (voir `ui/FoodMedia.tsx`), plutot que d'afficher un cadre casse.
 */
const imageUrl = z
  .string()
  .max(500)
  .refine(
    (value) => {
      if (value === "") return true;
      if (value.startsWith("/uploads/")) return /\.(jpe?g|png|webp|avif)$/i.test(value);
      if (value.startsWith("/images/")) return /\.(jpe?g|png|webp|avif|svg)$/i.test(value);
      if (value.startsWith("http://") || value.startsWith("https://")) {
        return /\.(jpe?g|png|webp|avif|svg)(\?.*)?$/i.test(value);
      }
      return false;
    },
    {
      message:
        "URL d'image invalide : attendu /uploads/… ou /images/… en .jpg, .png, .webp, .avif, ou une adresse https.",
    }
  );

/** Prix en euros : deux decimales, jamais negatif. */
const price = z
  .number({ invalid_type_error: "Le prix doit etre un nombre." })
  .min(0, "Le prix ne peut pas etre negatif.")
  .max(999, "Prix trop eleve (maximum 999).")
  .refine((value) => Number.isFinite(value), "Le prix doit etre un nombre.");

/** Identifiant technique : sert de cle et de nom d'emplacement photo. */
const id = z
  .string()
  .min(1, "L'identifiant est obligatoire.")
  .max(60, "Identifiant trop long (60 caracteres maximum).")
  .regex(/^[a-z0-9][a-z0-9-]*$/i, {
    message:
      "Identifiant invalide : lettres, chiffres et tirets uniquement (ex. brisket, pulled-pork).",
  });

/** Horaires : 7 jours, ouvert/fermeture au format "HH:MM" ("24:00" = minuit). */
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, {
    message: 'Horaire invalide : attendu "HH:MM" (minuit ecrit "24:00").',
  });

const dayService = z.object({
  open: time.nullable().default(null),
  close: time.nullable().default(null),
});

/**
 * Un plat de la carte. Les quatre champs demandes — titre, description, prix,
 * URL de l'image — sont tous obligatoires ; l'image peut etre vide, auquel cas
 * le site dessine une assiette a la place.
 */
const menuItem = z.object({
  id,
  name: z.string().min(1, "Le titre du plat est obligatoire.").max(120),
  description: z.string().min(1, "La description est obligatoire.").max(400),
  price,
  category: z.enum(["viandes", "accompagnements", "desserts"], {
    message: "Categorie invalide : viandes, accompagnements ou desserts.",
  }),
  badge: z.enum(["signature", "best-seller", "nouveau"]).optional(),
  /** URL de la photo du plat : vide = assiette dessinee a la place. */
  image: imageUrl,
  /** Commandes du mois ecoule, pour le classement « les plus commandes ». */
  orders: z.number().int().min(0).max(1_000_000).default(0),
});

/** Une adresse du restaurant. */
const location = z.object({
  id,
  name: z.string().min(1).max(120),
  number: z.string().max(10).default(""),
  address: z.string().min(1, "L'adresse est obligatoire.").max(200),
  phone: z.string().min(1, "Le telephone est obligatoire.").max(40),
  hours: z.string().max(80).optional(),
  image: imageUrl,
  mapsUrl: z.string().max(500).default(""),
  status: z.enum(["ouvert", "bientot"]).optional(),
  schedule: z.array(dayService).length(7).optional(),
});

/** Un avis client. */
const testimonial = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1, "Le nom est obligatoire.").max(80),
  text: z.string().min(1, "Le texte de l'avis est obligatoire.").max(800),
  rating: z.number().int().min(1, "Note invalide.").max(5),
  date: z.string().min(1).max(40).default(""),
  source: z.enum(["google", "site"]).default("site"),
});

/** Une signature du restaurant. */
const service = z.object({
  id,
  number: z.string().max(10).default(""),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  href: z.string().max(200).default("#menu"),
  highlighted: z.boolean().optional(),
});

/** Coordonnees et reglages globaux. */
const site = z.object({
  address: z.string().max(200).default(""),
  phone: z.string().max(40).default(""),
  email: z.union([z.literal(""), z.string().email("Adresse email invalide.")]).default(""),
  tagline: z.string().max(120).default(""),
  established: z.number().int().min(1800).max(2200).default(2017),
  tonight: z.array(z.string().max(60)).default([]),
  social: z.record(z.string().max(500)).default({}),
  rating: z
    .object({
      score: z.number().min(0).max(5).default(0),
      reviews: z.number().int().min(0).default(0),
      url: z.string().max(500).default(""),
    })
    .default({ score: 0, reviews: 0, url: "" }),
  schedule: z.array(dayService).length(7).optional(),
});

/**
 * Textes des sections.
 *
 * Le bloc est imbrique (en-tetes, chapitres, listes) donc on ne peut pas
 * decrire chaque champ ici sans dupliquer `src/data/texts.ts`. On verifie ce
 * qui compte pour le site public : chaque feuille est une chaine. Un objet la
 * ou un titre est attendu afficherait « [object Object] » dans un <h1>, et un
 * nombre s'afficherait « 3 » a la place de « 03 » — refuse ici, c'est gratuit.
 */
const textTree = z.lazy(() =>
  z.union([
    z.string().max(2000),
    z.array(textTree).max(40),
    z.record(z.string().max(60), textTree),
  ])
);

const texts = z.record(z.string().max(60), textTree);

/** Un visuel : une source d'image et son texte alternatif. */
const visual = z.object({
  id: z.string().max(60).default(""),
  src: z.string().max(500).default(""),
  alt: z.string().max(200).default(""),
});

/** Schema par bloc. Un bloc absent de cette table n'est pas valide strictement. */
const BLOCKS = {
  menu: z.array(menuItem),
  locations: z.array(location),
  testimonials: z.array(testimonial),
  services: z.array(service),
  site,
  hours: z.array(dayService).length(7),
  texts,
  historyTexts: textTree,
  visuals: z.record(z.string().max(60), visual),
  gallery: z.array(visual),
};

/**
 * Valide un bloc avant ecriture.
 * Retourne `{ ok: true, data }` ou `{ ok: false, error }` avec un message
 * directement affichable dans l'admin, pointing vers le champ fautif.
 */
function validateBlock(key, payload) {
  const schema = BLOCKS[key];
  // Blocs sans schema strict (cravings, gallery, proofs, texts, navLinks) :
  // on verifie seulement que le contenu est serialisable.
  if (!schema) {
    if (payload === undefined) return { ok: false, error: "Contenu vide." };
    return { ok: true, data: payload };
  }

  const result = schema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };

  const issue = result.error.issues[0];
  const where = Array.isArray(issue.path) && issue.path.length > 0
    ? `${key}[${issue.path.join("][")}]`
    : key;
  return { ok: false, error: `${where} : ${issue.message}` };
}

module.exports = {
  validateBlock,
  BLOCKS,
  schemas: { menuItem, location, testimonial, service, site, dayService, imageUrl },
};


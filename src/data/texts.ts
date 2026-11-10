/**
 * Textes des sections du site.
 *
 * Ces accroches étaient écrites en dur dans les composants, donc hors de
 * portée de l'espace d'administration. Elles sont déclarées ici, regroupées par
 * section, et lues par `content/store.tsx` : l'admin peut les modifier, et le
 * site retombe sur ces valeurs si le backend est indisponible.
 *
 * Le format est volontairement plat — une chaîne par clé — parce que le bloc
 * est éditable champ par champ dans l'admin. Les libellés de navigation et les
 * chiffres du bandeau de preuve ne sont pas ici : ils vivent déjà dans
 * `data/site.ts` et sont modifiables.
 */

/** En-tête d'une section : le trio étiquette / titre / accent. */
export interface SectionHeadingTexts {
  /** Pastille numérotée ("01"), peut être vide. */
  number?: string;
  /** Sur-titre court ("Notre histoire"). */
  label: string;
  /** Grand titre ("Fumé,"). */
  title: string;
  /** Italique à côté du titre ("jamais pressé"). */
  accent?: string;
  /** Accroche sous le titre. */
  subtitle?: string;
}

export interface SiteTexts {
  /** Bandeau du haut, sous le hero. */
  proof: {
    cautionTape: string;
    rotatorLabel: string;
    ctaLabel: string;
  };
  cravings: SectionHeadingTexts;
  /** Ruban doré répété. */
  marquee: string[];
  concept: SectionHeadingTexts & {
    chapters: { title: string; text: string }[];
    chips: string[];
    frameCaption: string;
    frameNote: string;
    stamp: string;
    quote: string;
    quoteAuthor: string;
  };
  /** Sections suivantes, simple en-tête. */
  services: SectionHeadingTexts;
  menu: SectionHeadingTexts;
  locations: SectionHeadingTexts;
  testimonials: SectionHeadingTexts;
  gallery: SectionHeadingTexts;
  info: SectionHeadingTexts & { reservationNote: string };
  contact: SectionHeadingTexts & { offlineNotice: string; successNote: string };
  /** Hero. */
  hero: {
    eyebrow: string;
    paragraph: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  /** Barre de navigation, en plus des liens (voir `data/site.ts`). */
  nav: { historyLabel: string; ctaLabel: string };
}

export const siteTexts: SiteTexts = {
  proof: {
    cautionTape: "Grillé à Abidjan, Zone 4, Riviera, Deux-Plateaux, Yopougon",
    rotatorLabel: "Au grill :",
    ctaLabel: "Réserver une table",
  },

  cravings: {
    number: "01",
    label: "Envies du grill",
    title: "Ça grille,",
    accent: "ça se partage",
    subtitle: "Ribs, burgers, mix grill : choisissez d'abord avec les yeux.",
  },

  marquee: [
    "Ribs Ô Ribs",
    "Texas Crunchy",
    "Juicy Maxwell",
    "Grand Canyon",
    "Mix Grill",
    "Yo baby, what's up ?",
    "Abidjan",
  ],

  concept: {
    number: "02",
    label: "Notre histoire",
    title: "Grillé,",
    accent: "partagé",
    subtitle:
      "Depuis 2017, un grill à l'américaine à Abidjan : viandes marinées, portions généreuses, à partager.",
    chapters: [
      {
        title: "Le grill",
        text: "Steaks, ribs et poulet texan cuits au feu.",
      },
      {
        title: "La viande",
        text: "Le fondateur revendique la viande fraîche plutôt que congelée.",
      },
      {
        title: "Les burgers",
        text: "Juicy Maxwell, Texas Crunchy, Grand Canyon et leurs versions doubles.",
      },
      {
        title: "La table",
        text: "Mix grill et plateaux à partager.",
      },
    ],
    chips: ["Depuis 2017", "Viande fraîche", "Ribs Ô Ribs", "Abidjan"],
    frameCaption: "Ce que vous voyez, vous le mangez",
    frameNote: "Grill, Abidjan",
    stamp: "Depuis 2017",
    quote: "Yo baby, what's up ?",
    // TODO(client): confirmer l'usage
    quoteAuthor: "King Maxwell",
  },

  services: {
    number: "03",
    label: "Ce qu'on sert",
    title: "Quatre",
    accent: "Signatures",
    subtitle: "Du burger au mix grill, nos quatre signatures.",
  },

  menu: {
    number: "04",
    label: "La Carte",
    title: "Nos",
    accent: "Spécialités",
    subtitle: "Ouvrez une catégorie pour dérouler les plats. Prix en FCFA.",
  },

  locations: {
    number: "05",
    label: "Nos Adresses",
    title: "Nos adresses",
    accent: "à Abidjan",
    subtitle:
      "Retrouvez Texas GrillZ à Marcory Zone 4, Riviera Jardin, Deux-Plateaux, Yopougon et Cocody Cité des Arts.",
  },

  testimonials: {
    number: "07",
    label: "Avis",
    title: "Ce qu'on en",
    accent: "Dit",
  },

  gallery: {
    number: "06",
    label: "Galerie",
    title: "Ça se",
    accent: "mange des yeux",
    subtitle: "Des plats servis chaque jour dans nos adresses d'Abidjan.",
  },

  info: {
    number: "08",
    label: "Infos Pratiques",
    title: "Nous",
    accent: "Trouver",
    subtitle: "Horaires, adresse et contact. On vous attend.",
    reservationNote: "Par téléphone, par WhatsApp ou avec le formulaire.",
  },

  contact: {
    number: "09",
    label: "Réservation",
    title: "Réservez votre",
    accent: "Table",
    subtitle:
      "Remplissez le formulaire : nous vous rappelons ou vous écrivons sur WhatsApp pour confirmer.",
    offlineNotice:
      "Les demandes en ligne ne sont pas actives : appelez-nous ou écrivez-nous sur WhatsApp.",
    successNote:
      "Merci ! Nous vous recontactons par téléphone ou WhatsApp pour confirmer votre table.",
  },

  hero: {
    eyebrow: "Grill texan, Abidjan",
    paragraph:
      "Viandes marinées et grillées : ribs, steaks, poulet texan et burgers généreux, à partager entre amis.",
    ctaPrimary: "Réserver une table",
    ctaSecondary: "Découvrir la carte",
  },

  nav: {
    historyLabel: "Notre Histoire",
    ctaLabel: "Réserver une table",
  },
};

/**
 * Page Histoire : chapitres et citation. Séparé de `siteTexts` car c'est la
 * seule page longue, et son édition ferait bruit dans l'écran « Textes ».
 */
export interface HistoryTexts {
  chapters: {
    /** Sur-titre numéroté (« 01. Les Débuts »). */
    title: string;
    /** Grand titre, en deux parties : la seconde est mise en or. */
    heading: [string, string];
    paragraphs: string[];
  }[];
  quote: string;
  signature: { name: string; role: string };
}

export const historyTexts: HistoryTexts = {
  chapters: [
    {
      title: "01. Les Débuts",
      heading: ["Un grill de quartier,", "une adresse qui grandit"],
      paragraphs: [
        "Texas GrillZ naît à Abidjan en 2017, d'une idée simple : de la viande fraîche, bien assaisonnée, grillée devant vous.",
        "Son fondateur, Maxwell Goris, a choisi de miser sur la fraîcheur plutôt que sur la taille des grandes chaînes de fast-food.",
      ],
    },
    {
      title: "02. L'Évolution",
      heading: ["Plusieurs adresses,", "une même cuisine"],
      paragraphs: [
        "Après ses premières adresses, l'enseigne ouvre le 1er avril 2022 à Marcory Zone 4, dans une version lounge plus aboutie.",
        "Un chef venu de France y a formé les équipes ; la carte s'est enrichie d'un menu halal, de burgers de poulet et de spécialités d'agneau. (TODO(client): confirmer que ces plats sont encore servis)",
      ],
    },
  ],
  quote: "Yo baby, what's up ?",
  signature: { name: "King Maxwell", role: "Fondateur" },
};

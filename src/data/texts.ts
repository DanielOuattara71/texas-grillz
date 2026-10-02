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
  /** Section « Ça fume, ça colle aux doigts ». */
  cravings: SectionHeadingTexts;
  /** Ruban doré répété. */
  marquee: string[];
  /** Section « Fumé, jamais pressé ». */
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
    cautionTape: "Fumé au feu de hêtre — Lyon 3ᵉ",
    rotatorLabel: "Ce soir au feu de hêtre :",
    ctaLabel: "Réserver une table",
  },

  cravings: {
    number: "01",
    label: "Envies du feu",
    title: "Ça fume,",
    accent: "ça colle aux doigts",
    subtitle:
      "Tout sort du smoker le matin même : quatre coupes fumées, trois accompagnements maison, une tarte aux pécan. Choisissez d'abord avec les yeux.",
  },

  marquee: [
    "Croûte de poivre",
    "Laque miel-bourbon",
    "Cheddar affiné",
    "Cornbread tiède",
    "Fumé 12 h",
    "Lyon 3ᵉ",
  ],

  concept: {
    number: "02",
    label: "Notre histoire",
    title: "Fumé,",
    accent: "jamais pressé",
    subtitle:
      "Depuis 2017 à Lyon 3ᵉ, la même routine : allumer le feu à l'aube, laisser la fumée travailler, ouvrir le smoker quand la croûte est prise. C'est long, c'est le goût.",
    chapters: [
      {
        title: "Le feu",
        text: "Le bois de hêtre entre dans le smoker avant le jour. Douze heures de fumée, une chaleur constante, aucun raccourci.",
      },
      {
        title: "La viande",
        text: "Quatre coupes chaque matin — brisket, ribs, pulled pork, poulet fermier. Jamais réchauffées, jamais en attente.",
      },
      {
        title: "L'ardoise",
        text: "Coleslaw coupée le matin, mac & cheese gratiné à la commande, cornbread tiédi au dernier moment.",
      },
      {
        title: "La table",
        text: "Les sauces au centre, les planches qui circulent, et le temps qu'il faut pour tout finir proprement.",
      },
    ],
    chips: ["12 h de fumage", "4 coupes par matin", "Bois de hêtre", "Lyon 3ᵉ, depuis 2017"],
    frameCaption: "Ce que vous voyez, vous le mangez",
    frameNote: "Bois de hêtre · aucune précipitation",
    stamp: "Smoker · 5 h 30",
    quote: "« On ne presse rien : c'est le temps qui fait le goût. »",
    quoteAuthor: "Texas GrillZ — fondateur & chef",
  },

  services: {
    number: "03",
    label: "Ce qu'on sert",
    title: "Quatre",
    accent: "Signatures",
    subtitle:
      "Du fumé lent au service privatisé : quatre façons de vivre Texas GrillZ.",
  },

  menu: {
    number: "04",
    label: "La Carte",
    title: "Nos",
    accent: "Spécialités",
    subtitle:
      "Fumage lent au bois de hêtre, assaisonnements maison. Ouvrez une catégorie pour dérouler les plats.",
  },

  locations: {
    number: "05",
    label: "Nos Lieux",
    title: "Nos sites",
    accent: "en Métropole",
    subtitle: "Trouvez le Texas GrillZ le plus proche de chez vous.",
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
    subtitle:
      "Ce que vous voyez ici sort de nos cuisines : les mêmes planches, les mêmes portions, servies le soir même.",
  },

  info: {
    number: "08",
    label: "Infos Pratiques",
    title: "Nous",
    accent: "Trouver",
    subtitle: "Horaires, adresse et contact — on vous attend.",
    reservationNote:
      "Par téléphone ou en ligne. Réservation recommandée le week-end.",
  },

  contact: {
    number: "09",
    label: "Réservation",
    title: "Réservez votre",
    accent: "Table",
    subtitle:
      "Remplissez le formulaire ci-dessous et nous vous confirmerons votre réservation par email.",
    offlineNotice:
      "Les demandes en ligne ne sont pas encore actives.",
    successNote:
      "Merci pour votre demande de réservation. Nous vous confirmerons par email dans les plus brefs délais.",
  },

  hero: {
    eyebrow: "Barbecue au feu de bois — Lyon",
    paragraph:
      "Ça fume depuis l'aube : croûte de poivre noir, laque miel-bourbon, accompagnements faits le matin même.",
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
    /** Sur-titre numéroté (« 01 — Les Débuts »). */
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
      title: "01 — Les Débuts",
      heading: ["Un voyage au Texas,", "une envie de partage"],
      paragraphs: [
        "Tout commence par un voyage. Un voyage au cœur du Texas, où le barbecue est bien plus qu'une cuisine : c'est une culture, un art de vivre, un moment de partage.",
        "De retour en France, une évidence s'impose : cette tradition n'existe pas à Lyon. Une envie naît. Celle de faire découvrir ces saveurs fumées, ces cuissons lentes, ces sauces maison qui font la renommée du BBQ texan.",
      ],
    },
    {
      title: "02 — L'Évolution",
      heading: ["Trois sites,", "une même exigence"],
      paragraphs: [
        "En 2020, Texas GrillZ ouvre son deuxième site à Lyon 7ème. En 2023, c'est à Villeurbanne que la famille s'agrandit. Trois adresses, une même exigence : la qualité des produits, le respect des cuissons, et l'accueil chaleureux.",
        "Aujourd'hui, c'est une équipe de passionnés qui perpétue la tradition. Chaque matin, le bois de hêtre est allumé. Chaque soir, les viandes sont fumées pour le lendemain.",
      ],
    },
  ],
  quote:
    "« Le barbecue, c'est le temps. Le temps de fumer, le temps de mijoter, le temps de partager. Chaque pièce de viande qui sort de notre cuisine porte en elle cette philosophie. Nous ne nous pressons jamais, car c'est le temps qui fait la différence. »",
  signature: { name: "Texas GrillZ", role: "Fondateur & Chef" },
};


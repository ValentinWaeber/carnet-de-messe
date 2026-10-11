import {
  createBlock,
  FORMATS,
  richText,
  uid,
  resizeDocument,
  type Block,
  type BookDocument,
} from "./document";

export type Template = {
  id: string;
  name: string;
  description: string;
  category: "Intemporels" | "Nature" | "Modernes";
  paper: string;
  ink: string;
  accent: string;
  font: Block["style"]["font"];
  ornament: Block["ornament"];
  layout: number;
};
export const templates: Template[] = [
  {
    id: "classique-ivoire",
    name: "Classique ivoire",
    description:
      "Une élégance intemporelle, un cadre fin et un papier chaleureux.",
    category: "Intemporels",
    paper: "#faf6eb",
    ink: "#504b3f",
    accent: "#aa9367",
    font: "classic",
    ornament: "frame",
    layout: 0,
  },
  {
    id: "minimaliste",
    name: "Minimaliste",
    description: "L’essentiel, beaucoup d’espace et une ligne délicate.",
    category: "Modernes",
    paper: "#fdfcf9",
    ink: "#323732",
    accent: "#8d9585",
    font: "sans",
    ornament: "cross",
    layout: 1,
  },
  {
    id: "floral",
    name: "Floral",
    description:
      "Une fleur dessinée à la main pour une célébration toute en douceur.",
    category: "Nature",
    paper: "#fcf6f2",
    ink: "#6b4f53",
    accent: "#b37a82",
    font: "serif",
    ornament: "flower",
    layout: 2,
  },
  {
    id: "botanique",
    name: "Botanique",
    description:
      "Des feuillages légers, une arche et une touche de vert sauge.",
    category: "Nature",
    paper: "#f7f8f0",
    ink: "#43503d",
    accent: "#7c8b6b",
    font: "serif",
    ornament: "branch",
    layout: 3,
  },
  {
    id: "champetre",
    name: "Champêtre",
    description:
      "Un esprit de campagne, des brins délicats et des mots simples.",
    category: "Nature",
    paper: "#f4eddc",
    ink: "#675942",
    accent: "#9b895e",
    font: "classic",
    ornament: "sprig",
    layout: 4,
  },
  {
    id: "dore",
    name: "Doré",
    description: "Un médaillon et des accents dorés, sans éclat excessif.",
    category: "Intemporels",
    paper: "#fdf9ef",
    ink: "#625136",
    accent: "#b28d48",
    font: "serif",
    ornament: "circle",
    layout: 5,
  },
  {
    id: "typographique",
    name: "Typographique",
    description: "Des noms en grand, une composition éditoriale affirmée.",
    category: "Modernes",
    paper: "#f6f3ea",
    ink: "#373831",
    accent: "#8c7160",
    font: "serif",
    ornament: "cross",
    layout: 6,
  },
  {
    id: "aquarelle",
    name: "Aquarelle",
    description: "Des lavis vectoriels doux et une composition aérienne.",
    category: "Nature",
    paper: "#fcfaf7",
    ink: "#557178",
    accent: "#78a3aa",
    font: "serif",
    ornament: "wash",
    layout: 2,
  },
  {
    id: "traditionnel",
    name: "Traditionnel",
    description:
      "Une croix centrale, des caractères classiques et un double filet.",
    category: "Intemporels",
    paper: "#fffdf7",
    ink: "#4d4038",
    accent: "#907e65",
    font: "classic",
    ornament: "cross",
    layout: 0,
  },
  {
    id: "contemporain",
    name: "Contemporain",
    description:
      "Une arche graphique, une police sobre et une mise en page décentrée.",
    category: "Modernes",
    paper: "#efece3",
    ink: "#42494e",
    accent: "#9b7060",
    font: "sans",
    ornament: "arch",
    layout: 7,
  },
  {
    id: "olivier",
    name: "Olivier",
    description: "Une couronne d’olivier, symbole de paix et de lien.",
    category: "Nature",
    paper: "#f8f7ef",
    ink: "#495440",
    accent: "#7d8864",
    font: "serif",
    ornament: "wreath",
    layout: 5,
  },
  {
    id: "rose-poudre",
    name: "Rose poudré",
    description: "Une arche rose, des initiales et une typographie romantique.",
    category: "Intemporels",
    paper: "#f8eded",
    ink: "#725559",
    accent: "#bb9092",
    font: "serif",
    ornament: "arch",
    layout: 3,
  },
  {
    id: "bleu-profond",
    name: "Bleu profond",
    description: "Une couverture bleu nuit, un losange et des lettres ivoire.",
    category: "Intemporels",
    paper: "#203e52",
    ink: "#f4f0e5",
    accent: "#c9b894",
    font: "classic",
    ornament: "diamond",
    layout: 5,
  },
  {
    id: "nature",
    name: "Nature",
    description:
      "Un papier terre, une grande branche et une composition asymétrique.",
    category: "Nature",
    paper: "#e9e2d2",
    ink: "#53583d",
    accent: "#818565",
    font: "sans",
    ornament: "branch",
    layout: 7,
  },
  {
    id: "noir-blanc",
    name: "Noir et blanc",
    description: "Un contraste franc, des grands caractères et un filet net.",
    category: "Modernes",
    paper: "#ffffff",
    ink: "#242424",
    accent: "#242424",
    font: "sans",
    ornament: "frame",
    layout: 6,
  },
];
function text(
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
  t: Template,
  overrides: Partial<Block["style"]> = {},
): Block {
  const b = createBlock(size > 18 ? "title" : "paragraph", t.ink);
  return {
    ...b,
    x,
    y,
    width,
    height,
    content: richText(content),
    style: {
      ...b.style,
      font: t.font,
      fontSize: size,
      align: "center",
      lineHeight: 1.35,
      ...overrides,
    },
  };
}
function decor(
  kind: Block["ornament"],
  x: number,
  y: number,
  width: number,
  height: number,
  t: Template,
  z = 0,
): Block {
  return {
    ...createBlock("decoration", t.accent),
    ornament: kind,
    x,
    y,
    width,
    height,
    z,
  };
}
export function createTemplateDocument(
  templateId: string,
  format = FORMATS.a5,
): BookDocument {
  const t = templates.find((t) => t.id === templateId) ?? templates[3];
  const cover: Block[] = [];
  if (t.id === "traditionnel") {
    cover.push(
      { ...createBlock("line", t.accent), x: 24, y: 19, width: 100, height: 1 },
      {
        ...createBlock("line", t.accent),
        x: 24,
        y: 185,
        width: 100,
        height: 1,
      },
      text("CÉLÉBRATION DU MARIAGE", 24, 27, 100, 12, 8, t, {
        letterSpacing: 1.4,
      }),
      decor("cross", 58, 45, 32, 34, t),
      text("Camille\n& Gabriel", 18, 96, 112, 46, 28, t),
      text("18 juin 2027", 24, 153, 100, 14, 11, t),
      text("Église Saint-Pierre", 24, 173, 100, 12, 9, t),
    );
  } else if (t.layout === 0) {
    cover.push(
      decor("frame", 10, 12, 128, 186, t),
      decor(t.ornament === "frame" ? "cross" : t.ornament, 61, 29, 26, 30, t),
    );
    cover.push(
      text("Camille\n& Gabriel", 24, 72, 100, 57, 29, t),
      text("CÉLÉBRATION DE NOTRE MARIAGE", 24, 143, 100, 15, 9, t, {
        letterSpacing: 1,
      }),
      text("18 juin 2027 · Église Saint-Pierre", 24, 169, 100, 14, 10, t),
    );
  } else if (t.layout === 1) {
    cover.push(
      text("C / G", 24, 30, 100, 25, 16, t, { letterSpacing: 4 }),
      decor("cross", 65, 75, 18, 23, t),
      text("Camille & Gabriel", 14, 120, 120, 25, 23, t),
      text("LE 18 JUIN 2027", 24, 157, 100, 12, 8, t, { letterSpacing: 2 }),
      text("Notre célébration", 24, 179, 100, 12, 10, t),
    );
  } else if (t.layout === 2) {
    cover.push(
      decor(t.ornament, 39, 18, 70, 70, t),
      text("Camille & Gabriel", 12, 100, 124, 32, 25, t, { italic: true }),
      text("Un jour, une promesse", 22, 142, 104, 16, 12, t),
      text("18 JUIN 2027", 24, 173, 100, 14, 9, t, { letterSpacing: 2 }),
    );
  } else if (t.layout === 3) {
    cover.push(
      decor("arch", 17, 18, 114, 165, t),
      decor(t.ornament === "arch" ? "flower" : t.ornament, 53, 32, 42, 42, t),
      text("Camille\n& Gabriel", 24, 84, 100, 55, 29, t),
      text("18 JUIN 2027", 24, 152, 100, 12, 9, t, { letterSpacing: 2 }),
      text("Le commencement d’une belle histoire", 24, 172, 100, 14, 9, t, {
        italic: true,
      }),
    );
  } else if (t.layout === 4) {
    cover.push(
      decor("sprig", 13, 25, 50, 73, t),
      decor("sprig", 85, 111, 48, 72, t),
      text("Camille\n&\nGabriel", 27, 61, 94, 80, 27, t),
      text("NOTRE MARIAGE", 24, 151, 100, 12, 9, t, { letterSpacing: 2 }),
      text("18 juin 2027", 24, 175, 100, 12, 12, t),
    );
  } else if (t.layout === 5) {
    cover.push(
      decor(t.ornament, 20, 25, 108, 108, t),
      text("C & G", 40, 65, 68, 26, 25, t),
      text("Camille & Gabriel", 16, 145, 116, 22, 22, t),
      text("18 JUIN 2027 · SAINT-PIERRE", 14, 177, 120, 14, 8, t, {
        letterSpacing: 1.2,
      }),
    );
  } else if (t.layout === 6) {
    cover.push(
      text("OUI.", 14, 27, 120, 45, 68, t, { align: "left", bold: true }),
      text("Camille\nGabriel", 14, 91, 120, 61, 33, t, { align: "left" }),
      text("18.06.2027", 14, 169, 100, 15, 11, t, {
        align: "left",
        letterSpacing: 2,
      }),
    );
    cover.push({
      ...createBlock("line", t.accent),
      x: 14,
      y: 155,
      width: 120,
      height: 2,
    });
  } else {
    cover.push(
      decor(t.ornament, 59, 15, 79, 164, t),
      text("Camille\n& Gabriel", 14, 78, 116, 62, 30, t, { align: "left" }),
      text("NOTRE CÉLÉBRATION", 14, 28, 105, 15, 9, t, {
        align: "left",
        letterSpacing: 1.5,
      }),
      text("18 juin 2027\nÉglise Saint-Pierre", 14, 171, 110, 23, 11, t, {
        align: "left",
      }),
    );
  }
  const insideT = {
    ...t,
    paper: t.id === "bleu-profond" ? "#faf8f0" : t.paper,
    ink: t.id === "bleu-profond" ? "#203e52" : t.ink,
  };
  const content = [
    [
      "Bienvenue",
      "Entourés de ceux que nous aimons, nous célébrons aujourd’hui notre engagement.\nMerci de partager ce moment avec nous.",
      "Camille & Gabriel",
    ],
    [
      "L’entrée",
      "Chant d’entrée\nIndiquez ici le titre du chant choisi et les couplets que vous souhaitez partager.\n\nMot d’accueil\nAjoutez les mots d’accueil de votre célébration.",
      "Nous nous rassemblons dans la joie.",
    ],
    [
      "La parole",
      "Première lecture\nInsérez ici la référence et le texte de la lecture choisie, avec l’accord de votre paroisse.\n\nPsaume et Évangile\nAjoutez les références et les réponses de l’assemblée.",
      "Une parole pour éclairer notre chemin.",
    ],
    [
      "Nos promesses",
      "Notre engagement\nÉcrivez ici vos paroles, dans la forme convenue avec la personne qui célèbre votre mariage.\n\nL’échange des alliances\nIndiquez les réponses de l’assemblée.",
      "Marcher ensemble, jour après jour.",
    ],
    [
      "La prière",
      "Prière universelle\nPour nos familles, pour nos amis et pour tous ceux qui nous accompagnent.\n\nAjoutez vos intentions et le refrain de l’assemblée.",
      "Un moment pour penser aux autres.",
    ],
    [
      "Merci",
      "À nos familles et à nos amis,\nà celles et ceux qui ont préparé cette célébration,\nmerci pour votre présence et votre affection.\n\nChant de sortie : à compléter.",
      "La joie se poursuit avec vous.",
    ],
  ];
  const now = new Date().toISOString();
  const doc: BookDocument = {
    schemaVersion: 1,
    id: uid(),
    title: `Carnet de Camille & Gabriel — ${t.name}`,
    createdAt: now,
    updatedAt: now,
    format: { ...FORMATS.a5 },
    margins: { top: 14, right: 14, bottom: 14, left: 14 },
    theme: { name: t.name, paper: t.paper, ink: t.ink, accent: t.accent },
    pages: [
      { id: uid(), background: t.paper, blocks: cover },
      ...content.map(([heading, body, footer], i) => ({
        id: uid(),
        background: insideT.paper,
        blocks: [
          decor(
            t.ornament === "frame" ? "cross" : t.ornament,
            62,
            16,
            24,
            24,
            insideT,
          ),
          text(heading, 20, 48, 108, 23, 24, insideT, {
            align: t.layout >= 6 ? "left" : "center",
          }),
          {
            ...text(body, 22, 83, 104, 86, 12, insideT, {
              align: "left",
              lineHeight: 1.65,
            }),
            type:
              i === 2
                ? ("reading" as const)
                : i === 1
                  ? ("song" as const)
                  : ("paragraph" as const),
          },
          text(footer, 20, 178, 108, 15, 9, insideT, { italic: true }),
          text(`${i + 2}`, 64, 198, 20, 8, 8, insideT),
        ],
      })),
      {
        id: uid(),
        background: t.paper,
        blocks: [
          decor(t.ornament, 49, 57, 50, 57, t),
          text("Avec tout notre amour", 20, 131, 108, 20, 14, t, {
            italic: true,
          }),
          text("Camille & Gabriel", 20, 158, 108, 18, 12, t),
        ],
      },
    ],
  };
  return format.width === 148 && format.height === 210
    ? doc
    : resizeDocument(doc, format);
}
export function createBlankDocument(format = FORMATS.a5): BookDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: uid(),
    title: "Mon carnet de messe",
    createdAt: now,
    updatedAt: now,
    format: { ...format },
    margins: { top: 14, right: 14, bottom: 14, left: 14 },
    theme: {
      name: "Carnet vierge",
      paper: "#fffdf8",
      ink: "#3c4239",
      accent: "#7c8b6b",
    },
    pages: Array.from({ length: 4 }, () => ({
      id: uid(),
      background: "#fffdf8",
      blocks: [],
    })),
  };
}

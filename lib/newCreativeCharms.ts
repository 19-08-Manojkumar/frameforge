import type { StickerDefinition, StickerPath } from "@/lib/stickers";

const paper = (d: string): StickerPath => ({ d, fill: "primary" });
const accent = (d: string): StickerPath => ({ d, fill: "secondary" });
const ink = (d: string, width = 0.45, opacity = 1): StickerPath => ({
  d,
  stroke: "secondary",
  width,
  opacity,
});
function charm(
  id: string,
  name: string,
  color: string,
  secondary: string,
  paths: StickerPath[],
  keywords: string,
  collection = "Playful accents",
): StickerDefinition {
  return {
    id: `charm-${id}`,
    name,
    color,
    secondary,
    paths,
    keywords,
    category: "Creative Charms",
    collection,
  };
}
function note(
  id: string,
  name: string,
  color: string,
  secondary: string,
  paths: StickerPath[],
  textArea: NonNullable<StickerDefinition["textArea"]>,
  keywords: string,
): StickerDefinition {
  return {
    ...charm(
      id,
      name,
      color,
      secondary,
      paths,
      `note notes notebook journal paper writing caption text ${keywords}`,
      "Notes & journals",
    ),
    defaultSize: 0.46,
    defaultOutline: false,
    textArea,
  };
}
const ruled = "M6 9H20 M6 12H20 M6 15H20 M6 18H20";
const topSpring = Array.from({ length: 6 }, (_, i) => {
  const x = 4.5 + i * 3;
  return `M${x} 4.5C${x - 1.5} -0.5 ${x + 1.7} -0.5 ${x + 1.4} 4.5`;
}).join(" ");
const sideSpring = Array.from({ length: 6 }, (_, i) => {
  const y = 4.5 + i * 3;
  return `M4.5 ${y}C-0.5 ${y - 1.5} -0.5 ${y + 1.7} 4.5 ${y + 1.4}`;
}).join(" ");

/** Ten writing surfaces followed by twenty independently drawn post accents. */
export const NEW_CREATIVE_CHARMS: StickerDefinition[] = [
  note(
    "sticky-corner",
    "Folded sticky note",
    "#f9e69f",
    "#ca9f43",
    [
      paper("M2 2H22V17L16 23H2Z"),
      { ...accent("M16 23V17H22Z"), opacity: 0.65 },
      ink("M3 3H21 M3 22H15", 0.3, 0.25),
    ],
    { left: 4, top: 5, width: 15, height: 11 },
    "sticky post it folded corner yellow",
  ),
  note(
    "top-spiral",
    "Spring notebook page",
    "#fff9e9",
    "#8b9b9a",
    [
      { ...accent("M3 3H23V24H3Z"), opacity: 0.25 },
      paper("M2 2H22V23H2Z"),
      ink(ruled, 0.25, 0.27),
      ink(topSpring, 0.9),
      ink("M5 7V21", 0.35, 0.3),
    ],
    { left: 6.5, top: 7.5, width: 13, height: 13 },
    "spring spiral top bound ruled lined",
  ),
  note(
    "side-spiral",
    "Side spiral journal",
    "#f7e6ee",
    "#98758e",
    [
      paper("M3 1H22V23H3Z"),
      { ...accent("M3 1H6V23H3Z"), opacity: 0.2 },
      ink(sideSpring, 0.9),
      ink("M8 6H20 M8 9H20 M8 12H20 M8 15H20 M8 18H20", 0.25, 0.22),
    ],
    { left: 8, top: 5, width: 12, height: 15 },
    "spring spiral side bound pink journal",
  ),
  note(
    "taped-memo",
    "Washi taped memo",
    "#fcf5e6",
    "#b4c6b1",
    [
      paper("M2 3L22 2L23 22L3 23Z"),
      {
        ...accent("M0 2L9 0L10 4L1 6Z M15 20L24 18L25 22L16 24Z"),
        opacity: 0.8,
      },
      ink("M4 7L20 6 M5 20L13 19.5", 0.3, 0.3),
    ],
    { left: 5, top: 8, width: 14, height: 10 },
    "taped washi tape memo scrapbook",
  ),
  note(
    "graph-planner",
    "Grid planner card",
    "#e8f0eb",
    "#739a90",
    [
      paper("M2 1H22V23H2Z"),
      ink(
        "M6 2V22 M10 2V22 M14 2V22 M18 2V22 M3 5H21 M3 9H21 M3 13H21 M3 17H21 M3 21H21",
        0.24,
        0.26,
      ),
      accent("M4 2H20V4H4Z"),
    ],
    { left: 4.5, top: 6, width: 15, height: 14 },
    "graph grid planner graph paper squared",
  ),
  note(
    "kraft-scrap",
    "Torn kraft journal",
    "#e6c7a0",
    "#a57a54",
    [
      paper(
        "M2 2L5 1L8 2L11 1L14 2L18 1L22 2L21.5 6L22 10L21 14L22 18L21 23L18 22L15 23L11 22L7 23L3 22L2 18L3 14L2 10L3 6Z",
      ),
      ink("M4 4L7 3 M18 21L20 20 M3 17L4 19", 0.4, 0.4),
      { ...accent("M7 0H16L15 4H8Z"), opacity: 0.45 },
    ],
    { left: 5, top: 6, width: 14, height: 14 },
    "torn kraft vintage scrap brown travel diary",
  ),
  note(
    "pinned-blush",
    "Pinned blush reminder",
    "#f5d9d6",
    "#b46e77",
    [
      paper("M2 3H22L21 23H3Z"),
      ink("M4 21H20", 0.4, 0.2),
      { ...accent("M14 6A2 2 0 1 1 10 6A2 2 0 1 1 14 6Z"), opacity: 0.3 },
      ink("M12 3V7", 0.7),
      accent("M14 2A2 2 0 1 1 10 2A2 2 0 1 1 14 2Z"),
    ],
    { left: 5, top: 9, width: 14, height: 11 },
    "pin pinned blush reminder thumbtack",
  ),
  note(
    "folded-letter",
    "Folded letter sheet",
    "#f4eddf",
    "#a6a0b6",
    [
      paper("M2 2H18L22 6V23H2Z"),
      { ...accent("M18 2V6H22Z"), opacity: 0.5 },
      ink("M3 14H21", 0.3, 0.23),
      { ...accent("M5 19H10L11 22H4Z"), opacity: 0.35 },
    ],
    { left: 5, top: 6, width: 13, height: 11 },
    "letter folded stationery lavender letterhead",
  ),
  note(
    "scalloped-caption",
    "Scalloped caption card",
    "#fff0e6",
    "#bd8c9d",
    [
      paper(
        "M4 3Q5 0 7 2Q9 0 11 2Q13 0 15 2Q17 0 19 2Q23 1 22 5Q25 7 22 9Q25 11 22 13Q25 15 22 17Q24 22 20 22Q18 25 16 22Q14 25 12 22Q10 25 8 22Q6 25 4 22Q0 23 2 19Q-1 17 2 15Q-1 13 2 11Q-1 9 2 7Q0 3 4 3Z",
      ),
      ink("M5 5H19V19H5Z", 0.45, 0.6),
      ink("M6 4H18 M6 20H18", 0.2, 0.3),
    ],
    { left: 6.5, top: 7, width: 11, height: 10 },
    "scalloped caption label stationery frame",
  ),
  note(
    "ring-binder",
    "Ring binder spread",
    "#f8f3e4",
    "#8bafac",
    [
      { ...accent("M0 3H24V23H0Z"), opacity: 0.4 },
      paper("M1 2Q6 0 11 3V22Q6 19 1 21Z M13 3Q18 0 23 2V21Q18 19 13 22Z"),
      ink(
        "M11 5Q12 3 13 5 M11 9Q12 7 13 9 M11 13Q12 11 13 13 M11 17Q12 15 13 17",
        0.85,
      ),
      ink("M3 7H9 M3 10H9 M15 7H21 M15 10H21 M15 13H21 M15 16H21", 0.22, 0.22),
    ],
    { left: 14.5, top: 6, width: 6.5, height: 12 },
    "open ring binder book spring double spread",
  ),

  charm(
    "checker-ribbon",
    "Checker picnic ribbon",
    "#cc8e9d",
    "#fae7d4",
    [
      paper("M2 5H22V18H2Z M2 18L6 22L7 18 M22 18L18 22L17 18"),
      accent(
        "M3 6H6V9H3Z M9 6H12V9H9Z M15 6H18V9H15Z M18 9H21V12H18Z M6 9H9V12H6Z M12 9H15V12H12Z M3 12H6V15H3Z M9 12H12V15H9Z M15 12H18V15H15Z M6 15H9V18H6Z M12 15H15V18H12Z M18 15H21V18H18Z",
      ),
    ],
    "checker gingham ribbon picnic aesthetic",
  ),
  charm(
    "matcha-moment",
    "Matcha moment",
    "#90a97a",
    "#ecd6b7",
    [
      paper("M4 8H18V19Q11 25 4 19Z M18 9H21Q26 15 18 17V14Q22 14 21 11H18Z"),
      accent("M18 8A7 3 0 1 1 4 8A7 3 0 1 1 18 8 M6 20H18V22H6Z"),
      ink("M8 2Q6 4 8 5 M13 1Q11 3 13 5", 0.7),
    ],
    "matcha coffee cafe cup slow morning cozy",
  ),
  charm(
    "digital-camera",
    "Pocket digital camera",
    "#91a9bd",
    "#e9dfd7",
    [
      paper(
        "M2 5H22Q24 5 24 8V19Q24 21 21 21H3Q0 21 0 18V8Q0 5 2 5 M4 3H10V5H4Z",
      ),
      accent("M19 13A7 7 0 1 1 5 13A7 7 0 1 1 19 13 M19 7H22V9H19Z"),
      paper("M16 13A4 4 0 1 1 8 13A4 4 0 1 1 16 13"),
      ink("M11 10Q9 10 9 12", 0.9),
    ],
    "digital digicam camera y2k photography memories",
    "Travel & collage",
  ),
  charm(
    "photo-booth",
    "Photobooth memories",
    "#eee0d4",
    "#916d83",
    [
      paper("M5 0L22 3L19 24L2 21Z"),
      accent(
        "M7 3L19 5L18 10L6 8Z M6 10L18 12L17 17L5 15Z M5 17L17 19L16.5 21L4.5 19Z",
      ),
      { ...paper("M10 7L13 4L15 8 M8 14L10 11L12 15"), opacity: 0.7 },
    ],
    "photo booth photobooth strip memory camera print",
    "Travel & collage",
  ),
  charm(
    "boarding-pass",
    "Weekend boarding pass",
    "#e7c6a2",
    "#648f96",
    [
      paper("M1 4H23V9Q19 12 23 15V21H1V15Q5 12 1 9Z"),
      ink("M16 5V20", 0.55),
      ink("M3 7H12 M3 18H12 M19 7V18 M21 7V18", 0.5),
      accent("M9 9L14 12L9 15L9.5 12.8H5V11.2H9.5Z"),
    ],
    "boarding pass plane flight weekend ticket",
    "Travel & collage",
  ),
  charm(
    "luggage-tag",
    "Adventure luggage tag",
    "#729e91",
    "#f5d8ae",
    [
      paper("M6 5L12 1L22 11L13 23L2 13Z"),
      accent(
        "M10 6A1.5 1.5 0 1 1 7 6A1.5 1.5 0 1 1 10 6 M8 12L14 18L18 14L12 8Z",
      ),
      ink("M8.5 6Q2 2 4 0", 0.85),
      ink("M6 14L11 19", 0.6),
    ],
    "luggage tag adventure suitcase baggage travel",
    "Travel & collage",
  ),
  charm(
    "coastal-stamp",
    "Coastal postage stamp",
    "#86aeb2",
    "#f6d2aa",
    [
      paper(
        "M3 1L5 2L7 1L9 2L11 1L13 2L15 1L17 2L19 1L21 2V22L19 23L17 22L15 23L13 22L11 23L9 22L7 23L5 22L3 23Z",
      ),
      accent("M5 4H19V20H5Z"),
      paper("M5 16Q9 12 13 16T19 16V20H5Z M15 9A3 3 0 1 1 9 9A3 3 0 1 1 15 9"),
      ink("M7 18Q10 16 13 18T18 18", 0.5),
    ],
    "beach coast coastal postage stamp postcard holiday",
    "Travel & collage",
  ),
  charm(
    "camping-patch",
    "Starry camp patch",
    "#678e87",
    "#f3d79a",
    [
      paper("M12 1Q23 1 23 12Q23 23 12 23Q1 23 1 12Q1 1 12 1"),
      ink("M12 3Q21 3 21 12Q21 21 12 21Q3 21 3 12Q3 3 12 3", 0.7),
      accent(
        "M5 18L12 8L19 18Z M8 6L8.7 7.8L10.5 8.5L8.7 9.2L8 11L7.3 9.2L5.5 8.5L7.3 7.8Z",
      ),
      paper("M12 11L16 18H12Z"),
    ],
    "camp camping patch tent night stars adventure",
    "Travel & collage",
  ),
  charm(
    "route-heart",
    "Heart shaped itinerary",
    "#c98396",
    "#e8c18a",
    [
      {
        d: "M12 20C3 15-1 8 4 4Q9 1 12 7Q15 1 21 4C26 10 19 17 12 20",
        stroke: "primary",
        width: 1.5,
        dash: [0.5, 1.7],
      },
      accent(
        "M5 10S1 6 1 4A4 4 0 1 1 9 4C9 6 5 10 5 10 M21 20L22 22L24 23L22 24L21 26L20 24L18 23L20 22Z",
      ),
    ],
    "heart route itinerary dotted road trip romance",
    "Travel & collage",
  ),
  charm(
    "ocean-bottle",
    "Ocean message bottle",
    "#82b2b0",
    "#eed3ab",
    [
      paper("M9 4H15V8Q21 11 21 15V21Q21 24 18 24H6Q3 24 3 21V15Q3 11 9 8Z"),
      accent("M8 1H16V5H8Z M5 16Q9 12 13 16T19 16V21H5Z M8 10H16V16H8Z"),
      ink("M10 12H14 M10 14H14", 0.5),
    ],
    "bottle message ocean sea beach summer",
    "Travel & collage",
  ),
  charm(
    "sunset-window",
    "Golden hour window",
    "#c58885",
    "#f4d29f",
    [
      paper("M3 23V10A9 9 0 0 1 21 10V23Z"),
      accent("M5 21V10A7 7 0 0 1 19 10V21Z"),
      paper("M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12 M5 17Q12 14 19 18V21H5Z"),
      ink("M12 3V21 M5 13H19", 0.8),
    ],
    "sunset golden hour arch window scenery",
    "Travel & collage",
  ),
  charm(
    "heart-balloon",
    "Chrome heart balloon",
    "#b896bf",
    "#eee4f2",
    [
      paper("M12 18C-5 9 2-4 12 3C22-4 29 9 12 18Z"),
      accent("M4 6Q5 2 9 4Q4 5 5 9Z M12 18L14 20H10Z"),
      ink("M12 20Q8 23 13 25", 0.65),
    ],
    "chrome heart balloon metallic birthday love y2k",
  ),
  charm(
    "ribbon-medal",
    "Little win rosette",
    "#d99791",
    "#f7dba8",
    [
      paper("M5 13L1 23L7 21L10 24L13 14 M13 14L15 24L18 21L23 23L19 12"),
      accent(
        "M12 1L15 3L19 2L20 6L23 9L21 12L22 16L18 17L15 20L12 18L8 20L6 17L2 16L3 12L1 9L4 6L5 2L9 3Z",
      ),
      paper("M18 10A6 6 0 1 1 6 10A6 6 0 1 1 18 10"),
      ink("M9 10L11 12L15 7", 1.1),
    ],
    "award little win rosette ribbon medal celebration",
  ),
  charm(
    "citrus-slice",
    "Fresh citrus slice",
    "#e6a357",
    "#fff0c8",
    [
      paper("M23 12A11 11 0 1 1 1 12A11 11 0 1 1 23 12"),
      accent("M21 12A9 9 0 1 1 3 12A9 9 0 1 1 21 12"),
      paper(
        "M13 4L13 10L18 6Z M20 9L14 11L20 13Z M19 16L14 13L16 20Z M12 20L11 14L7 19Z M4 15L10 13L4 11Z M5 7L10 10L9 4Z",
      ),
    ],
    "citrus orange fruit slice summer fresh",
  ),
  charm(
    "bow-tulips",
    "Bow tied tulips",
    "#a2b48b",
    "#e9a3b3",
    [
      paper(
        "M11 22L5 7H6L12 18L17 7H18L13 21L12 24Z M10 19Q1 19 3 12Q9 12 10 19 M14 18Q21 11 23 15Q21 21 14 18Z",
      ),
      accent(
        "M1 3L4 5L6 1L8 5L10 3V7Q5 14 1 7Z M14 2L17 4L19 0L21 4L24 2V7Q19 13 14 7Z M11 18Q3 11 5 19L11 20Q20 11 19 19L13 20L14 24H10Z",
      ),
    ],
    "tulip flowers bow tied bouquet spring romance",
  ),
  charm(
    "satin-orbit",
    "Satin orbit star",
    "#bc9bc9",
    "#f6ddb3",
    [
      paper("M12 0L15 8L24 12L15 15L12 24L9 15L0 12L9 8Z"),
      {
        d: "M3 18C-6 8 23 0 24 7C26 14 3 22 1 15",
        stroke: "secondary",
        width: 1.3,
      },
      accent("M10 6L12 11L18 12L12 13L10 18L10 13L5 12L10 11Z"),
    ],
    "satin orbit star sparkle celestial y2k",
  ),
  charm(
    "coffee-date",
    "Coffee date duo",
    "#b88b72",
    "#f1d8ae",
    [
      paper(
        "M1 7H10V16Q6 21 1 16Z M13 9H22V18Q18 23 13 18Z M10 9H12V14H10 M22 11H24V16H22",
      ),
      accent(
        "M10 7A4.5 2 0 1 1 1 7A4.5 2 0 1 1 10 7 M22 9A4.5 2 0 1 1 13 9A4.5 2 0 1 1 22 9",
      ),
      ink("M4 1Q2 3 4 4 M17 2Q15 4 17 5", 0.7),
    ],
    "coffee date cafe duo mugs morning couple",
  ),
  charm(
    "lucky-dice",
    "Pastel lucky dice",
    "#a7bba9",
    "#f9e8d4",
    [
      paper("M2 4L14 1L23 8V20L10 24L1 17Z"),
      accent("M3 5L10 10L21 8L14 3Z M11 12L21 10V19L11 22Z"),
      ink("M3 5L10 11V22", 0.5),
      paper(
        "M16 13A1 1 0 1 1 14 13A1 1 0 1 1 16 13 M19 18A1 1 0 1 1 17 18A1 1 0 1 1 19 18 M14 19A1 1 0 1 1 12 19A1 1 0 1 1 14 19",
      ),
      accent(
        "M6 12A1 1 0 1 1 4 12A1 1 0 1 1 6 12 M8 17A1 1 0 1 1 6 17A1 1 0 1 1 8 17",
      ),
    ],
    "dice lucky pastel playful game",
  ),
  charm(
    "ballet-ribbons",
    "Ballet ribbon shoes",
    "#d89ead",
    "#fce3df",
    [
      paper(
        "M5 8Q12 3 13 9L11 19Q6 27 2 21Z M14 11Q20 6 22 12L21 22Q17 27 13 22Z",
      ),
      accent("M6 10Q10 7 11 10L9 16L5 18Z M15 13Q19 10 20 13L19 18L15 20Z"),
      ink("M6 8L3 0 M9 7L15 1 M16 10L13 2 M19 9L24 3", 0.8),
    ],
    "ballet ribbon shoes coquette pink dance",
  ),
  charm(
    "bubble-star",
    "Bubble star smile",
    "#e9c578",
    "#a88ba8",
    [
      paper(
        "M12 1Q15-2 16 5L18 8Q27 7 23 13L19 16Q21 25 15 22L12 20Q3 27 4 19L5 15Q-4 11 4 8L8 7Z",
      ),
      ink("M9 11V13 M15 11V13 M9 15Q12 18 15 15", 0.9),
      { ...accent("M7 6Q10 3 11 5Q9 7 7 6"), opacity: 0.45 },
    ],
    "bubble star smile happy soft playful",
  ),
];

export const NOTE_CHARMS = NEW_CREATIVE_CHARMS.filter(
  (charm) => charm.textArea,
);

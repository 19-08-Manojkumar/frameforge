import type { StickerDefinition, StickerPath } from "@/lib/stickers";
import { NEW_CREATIVE_CHARMS } from "@/lib/newCreativeCharms";
const fill = (d: string): StickerPath => ({ d, fill: "primary" });
const accent = (d: string): StickerPath => ({ d, fill: "secondary" });
const ink = (d: string, width = 1): StickerPath => ({
  d,
  stroke: "secondary",
  width,
});
const charm = (
  id: StickerDefinition["id"],
  name: string,
  color: string,
  secondary: string,
  paths: StickerPath[],
  keywords: string,
): StickerDefinition => ({
  id,
  name,
  color,
  secondary,
  paths,
  category: "Creative Charms",
  keywords,
});

// Stable identifiers preserve draft references while the collection gets new artwork.
export const CREATIVE_CHARMS: StickerDefinition[] = [
  ...NEW_CREATIVE_CHARMS,
  charm(
    "paper-note",
    "Disco cherries",
    "#ca4c72",
    "#8caf84",
    [
      fill(
        "M11 16A5 5 0 1 1 1 16A5 5 0 1 1 11 16 M23 17A5 5 0 1 1 13 17A5 5 0 1 1 23 17",
      ),
      accent(
        "M5 12Q6 3 14 2Q12 10 18 13L16 14Q12 9 13 5Q8 6 7 13Z M14 3Q22 0 23 6Q17 8 14 3Z",
      ),
      ink("M3 15L6 13 M15 16L18 14 M6 18L8 16 M18 20L20 18", 1.2),
    ],
    "fruit cherry retro disco cute sparkle",
  ),
  charm(
    "paper-sticky",
    "Silk ribbon bow",
    "#d68caa",
    "#ffe4e6",
    [
      fill(
        "M11 11Q-2-2 1 10Q2 17 10 13L5 23L11 20L14 23L13 13Q25 20 23 8Q21-1 13 10Z",
      ),
      accent(
        "M10 9Q7 5 4 6Q1 12 10 12Z M14 10Q18 4 21 6Q24 12 14 12Z M11 10H14V14H11Z",
      ),
      ink("M7 20L11 14 M16 19L13 14", 0.7),
    ],
    "bow ribbon coquette soft fashion gift",
  ),
  charm(
    "paper-notebook",
    "Retro roller skate",
    "#a28ac1",
    "#f8ce79",
    [
      fill(
        "M5 2H14V10L21 13Q24 14 23 18H2V10L5 8Z M6 19A2 2 0 1 1 6 23A2 2 0 1 1 6 19 M19 19A2 2 0 1 1 19 23A2 2 0 1 1 19 19",
      ),
      accent("M6 3H12V8H6Z M3 15H21V18H3Z"),
      ink("M8 10H14 M8 12H16 M8 14H18", 0.8),
    ],
    "retro skate roller skate weekend playful",
  ),
  charm(
    "paper-postcard",
    "Sun catcher",
    "#c39246",
    "#f7e8ba",
    [
      fill(
        "M12 1L14 6L19 4L18 9L23 12L18 14L20 20L14 18L12 23L9 18L3 20L5 14L1 12L6 9L4 4L10 6Z",
      ),
      accent("M18 12A6 6 0 1 1 6 12A6 6 0 1 1 18 12"),
      {
        d: "M12 8V9 M12 15V16 M8 12H9 M15 12H16",
        stroke: "primary",
        width: 0.8,
      },
    ],
    "sun catcher celestial gold sunshine",
  ),
  charm(
    "paper-envelope",
    "Lucky eight ball",
    "#3c475c",
    "#f8e9d5",
    [
      fill("M23 12A11 11 0 1 1 1 12A11 11 0 1 1 23 12"),
      accent("M18 11A6 6 0 1 1 6 11A6 6 0 1 1 18 11"),
      {
        d: "M14 9A2 2 0 1 1 10 9A2 2 0 1 1 14 9 M14.3 13A2.3 2.3 0 1 1 9.7 13A2.3 2.3 0 1 1 14.3 13",
        stroke: "primary",
        width: 1.2,
      },
      ink("M4 8Q5 4 9 3", 0.9),
    ],
    "lucky magic eight ball pool y2k",
  ),
  charm(
    "paper-ticket",
    "Daisy vase",
    "#799d91",
    "#f7dfaa",
    [
      fill("M7 12H17L19 21Q12 25 5 21Z M11 6H13V14H11Z"),
      accent(
        "M12 3C7-2 6 5 9 6C2 5 4 12 10 9C8 16 15 16 14 9C20 12 24 6 16 6C20 1 14-2 12 3Z",
      ),
      { d: "M14 6A2 2 0 1 1 10 6A2 2 0 1 1 14 6", fill: "primary" },
      ink("M8 16Q12 19 16 16", 0.8),
    ],
    "flower vase daisy home botanical cottage",
  ),
  charm(
    "paper-tag",
    "Heart headphones",
    "#ca83a0",
    "#f4d8d8",
    [
      fill(
        "M2 14V10A10 10 0 0 1 22 10V14H19V10A7 7 0 0 0 5 10V14Z M1 12H7V22H2Q0 17 1 12 M17 12H23Q25 17 22 22H17Z",
      ),
      accent(
        "M4 15Q1 12 2 17L4 20L6 17Q7 12 4 15 M20 15Q17 12 18 17L20 20L22 17Q23 12 20 15",
      ),
      ink("M7 3Q12 0 17 3", 0.8),
    ],
    "music headphones heart love playlist",
  ),
  charm(
    "paper-bookmark",
    "Opal sea shell",
    "#b8a4cd",
    "#fff0dc",
    [
      fill("M3 17Q-2 10 3 7Q4 1 9 4Q12-2 16 4Q22 1 22 8Q28 12 21 18L16 22H8Z"),
      ink("M12 20L4 9 M12 20L8 5 M12 20V4 M12 20L17 5 M12 20L21 10", 1.1),
      accent("M8 20H16L17 23H7Z"),
    ],
    "shell sea opal beach mermaid coast",
  ),
  charm(
    "paper-checklist",
    "Passport charm",
    "#528b87",
    "#ead6a5",
    [
      fill("M5 1H19Q21 1 21 3V21Q21 23 19 23H5Q3 23 3 21V3Q3 1 5 1"),
      ink("M6 2V22 M8 18H17 M10 20H15", 0.7),
      ink(
        "M18 10A5 5 0 1 1 8 10A5 5 0 1 1 18 10 M8 10H18 M13 5Q8 10 13 15Q18 10 13 5",
        0.8,
      ),
    ],
    "passport travel globe explore tour",
  ),
  charm(
    "paper-grid",
    "Mountain enamel mug",
    "#cb916b",
    "#fff0d6",
    [
      fill(
        "M3 7H17V19Q17 22 10 22Q3 22 3 19Z M17 9H21Q25 14 21 18H17V15H20Q22 13 20 12H17Z",
      ),
      accent("M3 6H17V9H3Z M5 17L9 11L12 15L14 13L16 18H5Z"),
      ink("M7 1Q5 3 7 5 M12 1Q10 3 12 5", 0.8),
    ],
    "mug coffee camping mountains cozy",
  ),
  charm(
    "paper-lines",
    "Explorer boots",
    "#9d7558",
    "#e5c899",
    [
      fill("M3 2H11V14L15 17V22H1V16L3 13Z M13 1H20V12L24 15V20H16V16L13 14Z"),
      accent("M2 19H15V23H1Z M17 17H24V21H16Z"),
      ink("M5 6H9 M5 9H9 M5 12H9 M15 5H18 M15 8H18 M15 11H18", 0.9),
    ],
    "hiking boots walking trek explorer",
  ),
  charm(
    "paper-torn",
    "Palm island",
    "#4a9279",
    "#edc67c",
    [
      accent("M1 21Q12 14 23 21L21 23H3Z"),
      fill(
        "M10 20Q14 12 11 7H13Q17 13 14 20Z M12 7Q2-1 1 10Q6 6 12 8Q16-1 23 5Q17 5 13 8Q24 5 23 13Q17 9 13 8Q19 12 17 17Q14 12 12 8Q4 10 4 16Q1 9 12 7",
      ),
      ink("M16 2H22 M19 0V5", 0.7),
    ],
    "island palm tropical vacation beach",
  ),
  charm(
    "paper-folded",
    "Summit adventure patch",
    "#668d86",
    "#ebd6a0",
    [
      fill("M12 1L22 7V17L12 23L2 17V7Z"),
      ink("M12 3L20 8V16L12 21L4 16V8Z", 0.7),
      accent("M5 16L10 7L13 12L16 8L20 16Z M7 18H17V19H7Z"),
      { d: "M10 8L8 12L10 11L12 12Z", fill: "primary" },
    ],
    "mountain summit patch adventure outdoor badge",
  ),
  charm(
    "paper-memo",
    "Airplane window",
    "#87a9bc",
    "#f7e9cb",
    [
      fill("M8 1H16Q22 1 22 8V16Q22 23 16 23H8Q2 23 2 16V8Q2 1 8 1"),
      ink("M9 3H15Q20 3 20 9V15Q20 21 15 21H9Q4 21 4 15V9Q4 3 9 3Z", 1),
      accent(
        "M5 16Q7 11 11 15Q14 9 19 14V18H5Z M8 10L11 8L8 7L9 6L13 7L17 4L19 5L15 9L13 13H12L12 10L9 11Z",
      ),
    ],
    "airplane window flight clouds journey",
  ),
  charm(
    "paper-label",
    "Compass rose",
    "#ac8750",
    "#f6e5bc",
    [
      fill("M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12"),
      accent("M20 12A8 8 0 1 1 4 12A8 8 0 1 1 20 12"),
      fill("M15 4L14 14L5 20L10 10Z"),
      ink("M12 2V4 M12 20V22 M2 12H4 M20 12H22", 0.8),
    ],
    "compass direction explore navigation travel",
  ),
  charm(
    "paper-stamp",
    "Sunset arch",
    "#d48c77",
    "#f7d293",
    [
      fill("M2 23V12A10 10 0 0 1 22 12V23Z"),
      accent(
        "M17 11A5 5 0 1 1 7 11A5 5 0 1 1 17 11 M3 19Q8 10 14 18Q18 14 21 17V23H3Z",
      ),
      { d: "M2 22Q9 14 16 21Q19 18 22 20V24H2Z", fill: "primary" },
      ink("M6 4L7 6 M12 1V4 M18 4L17 6", 0.8),
    ],
    "sunset arch landscape desert boho sunshine",
  ),
  charm(
    "paper-washi",
    "Tropical cocktail",
    "#d39b79",
    "#b0c6a0",
    [
      fill("M2 7H20L13 16V21H18V23H6V21H11V16Z"),
      accent("M5 9H18L12 14Z M18 2A5 5 0 1 1 18 12L18 7L13 7A5 5 0 0 1 18 2"),
      ink("M14 8L18 1 M16 3L21 8", 0.9),
    ],
    "cocktail tropical party holiday drink",
  ),
  charm(
    "paper-index",
    "Night lantern",
    "#b7864c",
    "#f6dc9b",
    [
      fill("M10 1H14V5H18L21 10L19 21H5L3 10L6 5H10Z"),
      accent("M7 10H17V19H7Z"),
      {
        d: "M12 11L13 14L16 14L14 16L15 19L12 17L9 19L10 16L8 14H11Z",
        fill: "primary",
      },
      ink("M5 8H19 M7 22H17 M11 1V4", 0.8),
    ],
    "lantern night camping glowing stars",
  ),
  charm(
    "paper-polaroid",
    "Lucky horseshoe",
    "#af9568",
    "#f7dfaa",
    [
      fill("M3 2H9V12Q9 17 12 17Q15 17 15 12V2H21V12Q21 24 12 24Q3 24 3 12Z"),
      ink(
        "M5 5H7 M5 10H7 M6 15L8 14 M8 19L10 17 M17 5H19 M17 10H19 M16 14L18 15 M14 17L16 19",
        1,
      ),
      accent("M12 4L13 7L16 8L13 9L12 12L11 9L8 8L11 7Z"),
    ],
    "lucky horseshoe charm good luck cowboy",
  ),
  charm(
    "paper-calendar",
    "Heart sunglasses",
    "#bc789c",
    "#f2ccd7",
    [
      fill(
        "M6 8Q0 2 0 10Q1 16 6 19Q11 16 11 10Q11 3 6 8 M18 8Q12 2 13 10Q13 16 18 19Q23 16 24 10Q24 3 18 8",
      ),
      accent(
        "M6 10Q2 6 2 11Q3 14 6 16Q9 13 9 11Q9 7 6 10 M18 10Q14 6 15 11Q15 14 18 16Q21 13 22 11Q22 7 18 10Z",
      ),
      { d: "M10 10Q12 8 14 10", stroke: "primary", width: 2 },
    ],
    "sunglasses hearts fashion summer cute",
  ),
  charm(
    "paper-letter",
    "Adventure pennant",
    "#6b9b8b",
    "#f5deb1",
    [
      fill("M3 1H5V24H3Z M6 2L23 8L6 16Z"),
      accent("M8 10L12 5L15 9L18 7L21 9L8 13Z"),
      ink("M1 23H8", 1.3),
    ],
    "pennant flag adventure camp mountain",
  ),
  charm(
    "paper-journal",
    "Crystal cluster",
    "#9c89c7",
    "#dbe6e8",
    [
      fill(
        "M9 1L15 6L14 22L6 23L5 7Z M1 11L5 8L8 22H3Z M16 8L21 7L24 11L21 22H15Z",
      ),
      ink(
        "M9 1L11 8L9 22 M5 7L11 8L15 6 M16 8L19 12L18 22 M19 12L24 11 M1 11L5 13L5 22",
        0.8,
      ),
    ],
    "crystal gems gemstone mineral magic",
  ),
  charm(
    "paper-ribbon",
    "Crescent dream",
    "#b39858",
    "#f4dfaa",
    [
      fill("M17 1C-3 0-3 22 17 22C7 19 6 6 17 1Z"),
      accent(
        "M17 6L18 9L22 10L18 11L17 15L16 11L13 10L16 9Z M21 17L22 19L24 20L22 21L21 24L20 21L18 20L20 19Z",
      ),
      ink("M5 20V24 M11 22V24", 0.7),
    ],
    "moon crescent dream celestial gold stars",
  ),
  charm(
    "paper-cloud",
    "Daisy trio",
    "#e8bb5b",
    "#fff3dc",
    [
      accent(
        "M7 3C2-1 0 5 4 7C-2 8 0 14 5 11C5 17 11 16 10 10C16 11 16 5 10 5C12 0 7-2 7 3 M18 11C13 7 11 13 15 15C10 16 13 22 17 19C18 25 24 22 21 18C27 17 25 12 21 13C23 7 18 6 18 11",
      ),
      fill(
        "M9 7A2 2 0 1 1 5 7A2 2 0 1 1 9 7 M20 15A2 2 0 1 1 16 15A2 2 0 1 1 20 15",
      ),
      { d: "M5 11Q4 19 13 19", stroke: "primary", width: 1.4 },
    ],
    "daisies flower trio bloom garden cute",
  ),
  charm(
    "paper-speech",
    "Strawberry daydream",
    "#cf8294",
    "#f4e2bf",
    [
      fill("M12 5C-5 1 1 18 12 24C23 18 29 1 12 5Z"),
      accent("M12 7L5 3L9 3L11 0L13 3L19 2L17 5L21 8L15 7L12 11L10 7Z"),
      ink(
        "M6 10L7 12 M12 13V15 M18 10L17 12 M8 16L9 18 M16 16L15 18 M12 19V21",
        1,
      ),
    ],
    "strawberry fruit summer sweet botanical cute",
  ),
  charm(
    "paper-flower",
    "Forest mushroom",
    "#bd7a72",
    "#f2dbad",
    [
      fill("M1 13C0-4 24-4 23 13Q12 18 1 13"),
      accent(
        "M9 14H15L17 22Q12 25 7 22Z M7 7A2 2 0 1 1 3 7A2 2 0 1 1 7 7 M16 5A2 2 0 1 1 12 5A2 2 0 1 1 16 5 M21 10A2 2 0 1 1 17 10A2 2 0 1 1 21 10",
      ),
      ink("M4 12Q12 15 20 12", 0.8),
    ],
    "mushroom forest cottage nature woodland",
  ),
  charm(
    "paper-star",
    "Music mixtape",
    "#668b9f",
    "#f0cfb3",
    [
      fill("M3 4H21Q23 4 23 6V19Q23 21 21 21H3Q1 21 1 19V6Q1 4 3 4"),
      accent("M4 6H20V14H4Z M7 16H17L20 20H4Z"),
      fill(
        "M10 10A3 3 0 1 1 4 10A3 3 0 1 1 10 10 M20 10A3 3 0 1 1 14 10A3 3 0 1 1 20 10 M9 9H15V11H9Z",
      ),
      ink("M7 9V11 M6 10H8 M17 9V11 M16 10H18", 0.6),
    ],
    "cassette mixtape music retro playlist",
  ),
  charm(
    "paper-heart",
    "Lucky koi",
    "#d68a70",
    "#f1ddba",
    [
      fill("M13 3Q25 2 21 13Q18 20 10 20L3 24L5 17Q0 10 8 6Q10 5 13 3Z"),
      accent(
        "M16 4Q23 5 20 10L15 9L11 14L7 12L8 7Z M7 18L11 20L5 23Z M14 11L22 13L16 16Z",
      ),
      { d: "M17 6A1 1 0 1 1 15 6A1 1 0 1 1 17 6", fill: "primary" },
      ink("M10 8Q11 10 14 10 M6 14Q9 17 13 16", 0.7),
    ],
    "koi fish lucky water zen pond",
  ),
  charm(
    "paper-circle",
    "Bloom peace badge",
    "#d88e9e",
    "#f8d6aa",
    [
      fill(
        "M12 3C7-3 2 1 5 7C-2 6-3 13 4 15C0 21 6 26 11 21C15 28 23 24 20 18C28 17 27 9 21 8C24 0 16-3 12 3Z",
      ),
      accent("M18 12A6 6 0 1 1 6 12A6 6 0 1 1 18 12"),
      { d: "M12 6V18 M12 12L7 16 M12 12L17 16", stroke: "primary", width: 1.3 },
    ],
    "peace flower badge bloom positive",
  ),
  charm(
    "paper-scallop",
    "Botanical butterfly",
    "#8d9c78",
    "#efcaa7",
    [
      fill(
        "M11 11C2-4-5 7 6 14C-2 21 8 27 12 15C17 28 26 19 18 14C30 4 19-4 13 11Z",
      ),
      accent(
        "M9 10Q1 0 2 8L8 13Z M15 10Q22 0 22 8L16 13Z M7 17Q4 22 9 21L11 15Z M17 17Q21 22 16 21L13 15Z",
      ),
      { d: "M12 9V18 M12 10L9 6 M12 10L15 6", stroke: "primary", width: 1.2 },
    ],
    "butterfly botanical cottage wings garden",
  ),
];

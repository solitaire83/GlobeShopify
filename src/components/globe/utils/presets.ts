// TYPES
export type FactoidEffect = "fireworks" | "spin-highlight" | "points-of-presence" | "coins" | "typewriter" | "none";
export type Factoid = { heading: string; subheading: string; icon: string; effect: FactoidEffect; audio?: string };

// CONSTS & CONFIGS
const DIR = `${import.meta.env.BASE_URL}globe/`;

export const ASSETS = {
  env: `${DIR}textures/environment.hdr`,
  map: `${DIR}textures/earth-map.png`,
  land: `${DIR}textures/land-colors.png`,
  water: `${DIR}textures/water-colors.png`,
  dot: `${DIR}textures/dot.png`,
};

export const FACTOIDS: Factoid[] = [
  {
    heading: "Every 26 seconds",
    subheading: "an entrepreneur on Shopify makes their first sale",
    icon: `${DIR}icons/first-sale.svg`,
    effect: "fireworks",
  },
  {
    heading: "175 countries",
    subheading: "with merchants selling on Shopify",
    icon: `${DIR}icons/countries.svg`,
    effect: "spin-highlight",
  },
  {
    heading: "MILLIONS",
    subheading: "of merchants on Shopify",
    icon: `${DIR}icons/merchants.svg`,
    effect: "coins",
  },
  {
    heading: "$1,600,000,000,000",
    subheading: "total sales and counting",
    icon: `${DIR}icons/total-sales.svg`,
    effect: "typewriter",
    audio: `${DIR}sounds/total-sales.mp3`,
  },
  {
    heading: "$5,100,000",
    subheading: "sales per minute during peak sales times",
    icon: `${DIR}icons/peak-sales.svg`,
    effect: "none",
  },
];

export const FIREWORK_SITES: [number, number][] = [
  [43.72295236852082, -79.38854083014968],
  [39.76210685503683, -104.87585515282021],
  [20.675991647021114, -103.33579334431622],
  [40.28319087097476, -3.7966806555109898],
  [48.345511140929965, 10.885343719496737],
];

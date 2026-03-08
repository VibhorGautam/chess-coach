import type { RatingProfile } from "./types";

export const DEFAULT_DEPTH = 18;
export const DEFAULT_MULTI_PV = 8;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const STOCKFISH_WASM_PATH = "/stockfish/stockfish.wasm";

export const MIN_RATING = 500;
export const MAX_RATING = 2000;
export const RATING_STEP = 100;
export const GROWTH_FACTOR = 1.3;
export const MAX_TARGET_RATING = 2200;

// Temperature controls how "random" move selection is at each level.
// High = more random (weaker), low = sharper toward best moves (stronger).
export const RATING_PROFILES: RatingProfile[] = [
  {
    rating: 500,
    label: "Beginner",
    temperature: 300,
    avgCpLoss: 200,
    captureBonus: 0.35,
    checkBonus: 0.25,
    complexityDepthThreshold: 1,
    positionalBonus: 0.0,
  },
  {
    rating: 700,
    label: "Novice",
    temperature: 240,
    avgCpLoss: 160,
    captureBonus: 0.30,
    checkBonus: 0.22,
    complexityDepthThreshold: 1,
    positionalBonus: 0.02,
  },
  {
    rating: 900,
    label: "Low Intermediate",
    temperature: 180,
    avgCpLoss: 120,
    captureBonus: 0.25,
    checkBonus: 0.20,
    complexityDepthThreshold: 2,
    positionalBonus: 0.05,
  },
  {
    rating: 1000,
    label: "Intermediate",
    temperature: 150,
    avgCpLoss: 100,
    captureBonus: 0.20,
    checkBonus: 0.18,
    complexityDepthThreshold: 2,
    positionalBonus: 0.08,
  },
  {
    rating: 1200,
    label: "Upper Intermediate",
    temperature: 110,
    avgCpLoss: 75,
    captureBonus: 0.12,
    checkBonus: 0.12,
    complexityDepthThreshold: 3,
    positionalBonus: 0.12,
  },
  {
    rating: 1400,
    label: "Club Player",
    temperature: 80,
    avgCpLoss: 55,
    captureBonus: 0.05,
    checkBonus: 0.08,
    complexityDepthThreshold: 3,
    positionalBonus: 0.15,
  },
  {
    rating: 1500,
    label: "Strong Club",
    temperature: 75,
    avgCpLoss: 50,
    captureBonus: 0.03,
    checkBonus: 0.05,
    complexityDepthThreshold: 4,
    positionalBonus: 0.18,
  },
  {
    rating: 1700,
    label: "Expert",
    temperature: 50,
    avgCpLoss: 35,
    captureBonus: 0.01,
    checkBonus: 0.02,
    complexityDepthThreshold: 5,
    positionalBonus: 0.20,
  },
  {
    rating: 2000,
    label: "Candidate Master",
    temperature: 30,
    avgCpLoss: 20,
    captureBonus: 0.0,
    checkBonus: 0.0,
    complexityDepthThreshold: 6,
    positionalBonus: 0.22,
  },
];

export const DISPLAY_RATING_BANDS = [500, 1000, 1500, 2000] as const;

export const COMPLEXITY_DEPTH_DIVISOR = 6;

// Growth move must have cpLoss < this * avgCpLoss at the user's rating
export const COMPREHENSION_MULTIPLIER = 2.0;

// Target must be this much more likely to play the growth move than the user
export const GROWTH_PROBABILITY_RATIO = 1.5;

export const EXPLANATION_TIER_BOUNDARIES = {
  beginner: 800,
  intermediate: 1400,
} as const;

export const BOARD_SIZE = 560;
export const ANALYSIS_DEBOUNCE_MS = 300;

export const ARROW_COLORS = {
  userMove: "rgba(0, 100, 255, 0.6)",
  growthMove: "rgba(0, 200, 80, 0.8)",
  engineBest: "rgba(255, 170, 0, 0.5)",
} as const;

export const RATING_BAND_COLORS: Record<number, string> = {
  500: "#ef4444",
  1000: "#f97316",
  1500: "#eab308",
  2000: "#22c55e",
};

import type { RatingProfile } from "../lib/types";

export const RATING_BAND_PROFILES: RatingProfile[] = [
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
    rating: 1000,
    label: "Club Player",
    temperature: 150,
    avgCpLoss: 100,
    captureBonus: 0.20,
    checkBonus: 0.18,
    complexityDepthThreshold: 2,
    positionalBonus: 0.08,
  },
  {
    rating: 1200,
    label: "Upper Club",
    temperature: 110,
    avgCpLoss: 75,
    captureBonus: 0.12,
    checkBonus: 0.12,
    complexityDepthThreshold: 3,
    positionalBonus: 0.12,
  },
  {
    rating: 1500,
    label: "Intermediate",
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

export function getProfileForRating(rating: number): RatingProfile {
  const clamped = Math.max(500, Math.min(2000, rating));

  let lower = RATING_BAND_PROFILES[0];
  let upper = RATING_BAND_PROFILES[RATING_BAND_PROFILES.length - 1];

  for (let i = 0; i < RATING_BAND_PROFILES.length - 1; i++) {
    if (clamped >= RATING_BAND_PROFILES[i].rating && clamped <= RATING_BAND_PROFILES[i + 1].rating) {
      lower = RATING_BAND_PROFILES[i];
      upper = RATING_BAND_PROFILES[i + 1];
      break;
    }
  }

  if (lower.rating === upper.rating) return { ...lower };

  const t = (clamped - lower.rating) / (upper.rating - lower.rating);
  const lerp = (a: number, b: number) => a + (b - a) * t;

  return {
    rating: clamped,
    label: clamped === lower.rating ? lower.label : `~${clamped}`,
    temperature: lerp(lower.temperature, upper.temperature),
    avgCpLoss: lerp(lower.avgCpLoss, upper.avgCpLoss),
    captureBonus: lerp(lower.captureBonus, upper.captureBonus),
    checkBonus: lerp(lower.checkBonus, upper.checkBonus),
    complexityDepthThreshold: Math.round(
      lerp(lower.complexityDepthThreshold, upper.complexityDepthThreshold)
    ),
    positionalBonus: lerp(lower.positionalBonus, upper.positionalBonus),
  };
}

export const THINKING_PATTERNS: Record<number, string[]> = {
  500: [
    '"Ooh, I can take that piece!"',
    '"Check! That\'s always good, right?"',
    '"I\'ll just put my piece here..."',
    '"Wait, was that piece hanging?"',
  ],
  1000: [
    '"I should get my pieces developed."',
    '"Is that piece hanging? Let me take it."',
    '"Better castle before they attack."',
    '"What\'s my opponent threatening?"',
  ],
  1500: [
    '"I need to fight for central control."',
    '"This exchange improves my pawn structure."',
    '"My knight is better than their bishop here."',
    '"Time to activate my rook on the open file."',
  ],
  2000: [
    '"The pawn structure suggests a kingside attack."',
    '"I need prophylaxis against their plan."',
    '"This quiet move improves my worst piece."',
    '"The initiative is worth the material."',
  ],
};

export function getThinkingForRating(rating: number): string {
  const bands = [500, 1000, 1500, 2000];
  let closest = bands[0];
  for (const b of bands) {
    if (Math.abs(b - rating) < Math.abs(closest - rating)) closest = b;
  }
  const patterns = THINKING_PATTERNS[closest];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

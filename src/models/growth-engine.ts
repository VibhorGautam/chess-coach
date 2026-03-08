/**
 * The Growth Engine - Core Innovation
 *
 * Instead of showing the engine-best move (incomprehensible),
 * finds the move that's ~30% better than what you'd play.
 * A move you can understand and learn from.
 *
 * Algorithm:
 * 1. Engine evaluates position → top N moves with centipawn scores
 * 2. For each rating band, compute move probability distribution
 * 3. Find what user would likely play (highest probability at their rating)
 * 4. Find what someone ~200 ELO higher would play (growth target)
 * 5. Suggest the growth move with explanation at user's level
 */

import type {
  ScoredMove,
  FenString,
  RatingBandResult,
  GrowthRecommendation,
  MoveCategory,
} from "../lib/types";
import { DISPLAY_RATING_BANDS, GROWTH_FACTOR } from "../lib/constants";
import { getProfileForRating, getThinkingForRating } from "./rating-profiles";
import { rankMovesForRating } from "./move-probability";
import { classifyMove } from "./complexity-classifier";
import { generateExplanation, generateWhyBetter, deriveConcept } from "../lib/explanations";

/**
 * Analyze how each rating band would play in this position.
 */
export function analyzeAllRatings(
  moves: ScoredMove[],
  fen: FenString,
): RatingBandResult[] {
  return DISPLAY_RATING_BANDS.map((rating) => {
    const profile = getProfileForRating(rating);
    const ranked = rankMovesForRating(moves, fen, profile);
    const thought = getThinkingForRating(rating);

    return {
      rating,
      label: profile.label,
      moves: ranked.slice(0, 3),
      topMove: ranked[0],
      thought,
    };
  });
}

/**
 * Find the growth move for a specific user rating.
 *
 * The 30% rule: suggests a move that captures ~30% of the gap
 * between user's likely move and engine best.
 */
export function findGrowthRecommendation(
  moves: ScoredMove[],
  fen: FenString,
  userRating: number,
): GrowthRecommendation {
  const userProfile = getProfileForRating(userRating);
  const targetRating = Math.min(2000, Math.round(userRating * GROWTH_FACTOR));
  const targetProfile = getProfileForRating(targetRating);

  const userRanked = rankMovesForRating(moves, fen, userProfile);
  const targetRanked = rankMovesForRating(moves, fen, targetProfile);
  const ratingComparison = analyzeAllRatings(moves, fen);

  const userTop = userRanked[0];
  const targetTop = targetRanked[0];

  // Find the actual growth move
  let growthMoveProb = targetTop;

  // If target would play the same move, try 400 ELO higher
  if (targetTop.uci === userTop.uci) {
    const higherProfile = getProfileForRating(Math.min(2000, userRating + 400));
    const higherRanked = rankMovesForRating(moves, fen, higherProfile);
    if (higherRanked[0].uci !== userTop.uci) {
      growthMoveProb = higherRanked[0];
    }
  }

  const userMove = moves.find((m) => m.uci === userTop.uci)!;
  const growthMove = moves.find((m) => m.uci === growthMoveProb.uci)!;
  const isOptimal = growthMove.uci === userMove.uci;
  const cpImprovement = isOptimal ? 0 : Math.abs(growthMove.cp - userMove.cp);

  const userCls = classifyMove(userMove, fen, moves);
  const growthCls = classifyMove(growthMove, fen, moves);

  const tier = userRating < 800 ? "beginner" : userRating < 1400 ? "intermediate" : "advanced";

  const explanation = isOptimal
    ? "Great instinct! You'd already play the right move here."
    : generateExplanation(growthMove.san, growthCls.categories, tier);

  const whyBetter = isOptimal
    ? "You're already thinking at this level!"
    : generateWhyBetter(userMove.san, growthMove.san, cpImprovement, tier);

  const concept = isOptimal
    ? "Your intuition matches a stronger player's."
    : deriveConcept(growthCls.categories, tier);

  return {
    move: growthMove,
    moveCategories: growthCls.categories,
    userTopMove: userMove,
    userMoveCategories: userCls.categories,
    targetRating,
    explanation,
    whyBetter,
    concept,
    cpImprovement,
    ratingComparison,
    isUserMoveOptimal: isOptimal,
  };
}

import type {
  ScoredMove,
  FenString,
  RatingBandResult,
  GrowthRecommendation,
} from "../lib/types";
import { DISPLAY_RATING_BANDS, GROWTH_FACTOR } from "../lib/constants";
import { getProfileForRating, getThinkingForRating } from "./rating-profiles";
import { rankMovesForRating } from "./move-probability";
import { classifyMove } from "./complexity-classifier";
import { generateExplanation, generateWhyBetter, deriveConcept } from "../lib/explanations";

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

  let growthMoveProb = targetTop;

  // if target plays the same move, look further up
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

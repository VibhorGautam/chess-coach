/**
 * Move Probability Model
 *
 * Given engine-evaluated moves, computes the probability a player at a
 * given rating would choose each move.
 *
 * Core formula: P(move) proportional to attractiveness(move) * exp(-cpLoss / temperature)
 *
 * Inspired by MAIA Chess. Uses a weighted heuristic model instead of
 * a neural network, but captures the same key insight: lower-rated
 * players have systematic biases (love captures, miss quiet moves).
 */

import type {
  ScoredMove,
  RatingProfile,
  MoveProbability,
  MoveCategory,
  ClassifiedMove,
  FenString,
} from "../lib/types";
import { TacticalMotif, PositionalMotif } from "../lib/types";
import { classifyMove } from "./complexity-classifier";

/**
 * Compute probability distribution of moves for a given rating profile.
 *
 * Uses a Boltzmann (softmax) distribution where temperature is calibrated
 * to the player's average centipawn loss.
 */
export function computeMoveProbabilities(
  moves: ScoredMove[],
  fen: FenString,
  profile: RatingProfile,
): MoveProbability[] {
  if (moves.length === 0) return [];

  const bestCp = moves[0].cp;
  const temperature = Math.max(profile.temperature, 10);

  const classified = moves.map((m) => classifyMove(m, fen, moves));
  const scores: number[] = [];
  let totalScore = 0;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const cls = classified[i];
    const cpLoss = Math.abs(bestCp - move.cp);

    // Base score: Boltzmann distribution
    let score = Math.exp(-cpLoss / temperature);

    // Attractiveness bonuses based on move categories
    score *= getAttractivenessMultiplier(cls, profile);

    // Complexity penalty: lower-rated players can't find complex moves
    if (cls.complexityScore > 0.5 && profile.complexityDepthThreshold < 3) {
      const penalty = Math.max(0.05, 1 - cls.complexityScore);
      score *= penalty;
    }

    scores.push(score);
    totalScore += score;
  }

  return moves.map((move, i) => ({
    uci: move.uci,
    san: move.san,
    probability: totalScore > 0 ? scores[i] / totalScore : 1 / moves.length,
    cpLoss: Math.abs(bestCp - move.cp),
  }));
}

/**
 * How "attractive" a move appears to a player at a given rating.
 *
 * Key insight: a 500-rated player sees captures and checks as
 * 2-3x more attractive than quiet moves. A 2000-rated player
 * evaluates all moves more equally.
 */
function getAttractivenessMultiplier(
  cls: ClassifiedMove,
  profile: RatingProfile,
): number {
  let multiplier = 1.0;

  for (const cat of cls.categories) {
    switch (cat) {
      case TacticalMotif.Capture:
        multiplier += profile.captureBonus * 2;
        break;
      case TacticalMotif.Check:
        multiplier += profile.checkBonus * 2.5;
        break;
      case TacticalMotif.Sacrifice:
        multiplier += profile.captureBonus * 1.5;
        break;
      case TacticalMotif.Fork:
      case TacticalMotif.Pin:
      case TacticalMotif.Skewer:
        // Tactics: visible to higher-rated players
        multiplier += profile.positionalBonus * 1.5;
        break;
      case PositionalMotif.Development:
        multiplier += profile.positionalBonus * 1.2;
        break;
      case PositionalMotif.KingSafety:
        multiplier += profile.positionalBonus * 1.0;
        break;
      case PositionalMotif.CenterControl:
        multiplier += profile.positionalBonus * 1.3;
        break;
      case PositionalMotif.PieceActivity:
        // Quiet piece improvements: invisible to beginners
        multiplier += profile.positionalBonus * 2.0;
        break;
      default:
        multiplier += profile.positionalBonus;
    }
  }

  return multiplier;
}

/**
 * Rank moves for a specific rating, returning sorted by probability.
 */
export function rankMovesForRating(
  moves: ScoredMove[],
  fen: FenString,
  profile: RatingProfile,
): MoveProbability[] {
  return computeMoveProbabilities(moves, fen, profile)
    .sort((a, b) => b.probability - a.probability);
}

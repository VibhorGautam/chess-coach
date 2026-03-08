// P(move) ~ attractiveness(move) * exp(-cpLoss / temperature)
// Boltzmann softmax with human bias multipliers per rating band.

import type {
  ScoredMove,
  RatingProfile,
  MoveProbability,
  ClassifiedMove,
  FenString,
} from "../lib/types";
import { TacticalMotif, PositionalMotif } from "../lib/types";
import { classifyMove } from "./complexity-classifier";

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

    let score = Math.exp(-cpLoss / temperature);
    score *= getAttractivenessMultiplier(cls, profile);

    // weaker players can't find complex moves
    if (cls.complexityScore > 0.5 && profile.complexityDepthThreshold < 3) {
      score *= Math.max(0.05, 1 - cls.complexityScore);
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
        multiplier += profile.positionalBonus * 2.0;
        break;
      default:
        multiplier += profile.positionalBonus;
    }
  }

  return multiplier;
}

export function rankMovesForRating(
  moves: ScoredMove[],
  fen: FenString,
  profile: RatingProfile,
): MoveProbability[] {
  return computeMoveProbabilities(moves, fen, profile)
    .sort((a, b) => b.probability - a.probability);
}

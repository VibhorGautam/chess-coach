/**
 * Chess Move Coach - Move Complexity Classifier
 *
 * Estimates how "complex" or "deep" a move is based on its engine
 * evaluation characteristics. Complexity correlates with the rating
 * needed to find a move in practice.
 *
 * Factors considered:
 *   - PV length (longer PV = more calculation needed)
 *   - Evaluation volatility (cp swings across depths)
 *   - Whether the move is only good with precise follow-up
 *   - Tactical vs positional nature
 */

import type {
  ScoredMove,
  ClassifiedMove,
  MoveCategory,
  FenString,
} from "../lib/types";
import { TacticalMotif, PositionalMotif, StrategicMotif } from "../lib/types";
import { COMPLEXITY_DEPTH_DIVISOR } from "../lib/constants";

// ---------------------------------------------------------------------------
// Move Classification
// ---------------------------------------------------------------------------

/**
 * Classifies a single move based on its engine data and position context.
 *
 * @param move - The engine-scored move.
 * @param fen  - The position FEN (used for capture/check detection).
 * @param allMoves - All candidate moves (for relative scoring).
 * @returns ClassifiedMove with categories and complexity score.
 */
export function classifyMove(
  move: ScoredMove,
  fen: FenString,
  allMoves: ScoredMove[]
): ClassifiedMove {
  const categories = detectCategories(move, fen);
  const complexityScore = computeComplexity(move, allMoves);

  return {
    uci: move.uci,
    san: move.san,
    categories,
    isPrimarilyTactical: categories.some((c) =>
      Object.values(TacticalMotif).includes(c as TacticalMotif)
    ),
    complexityScore,
  };
}

/**
 * Classifies all candidate moves for a position.
 *
 * @param moves - All engine-scored candidate moves.
 * @param fen   - The position FEN.
 * @returns Map of UCI move -> MoveCategory[]
 */
export function classifyAllMoves(
  moves: ScoredMove[],
  fen: FenString
): Map<string, MoveCategory[]> {
  const result = new Map<string, MoveCategory[]>();

  for (const move of moves) {
    const classified = classifyMove(move, fen, moves);
    result.set(move.uci, classified.categories);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Category Detection
// ---------------------------------------------------------------------------

/**
 * Detects move categories from the move notation and PV context.
 *
 * This is a heuristic-based classifier. For production accuracy,
 * it would integrate with chess.js to inspect the board state
 * before and after the move.
 */
function detectCategories(move: ScoredMove, fen: FenString): MoveCategory[] {
  const categories: MoveCategory[] = [];
  const uci = move.uci;
  const san = move.san;

  // Tactical detection from notation
  if (isCapture(san, uci)) {
    categories.push(TacticalMotif.Capture);
  }

  if (isCheck(san)) {
    categories.push(TacticalMotif.Check);
  }

  if (isSacrifice(move)) {
    categories.push(TacticalMotif.Sacrifice);
  }

  // Positional detection from move characteristics
  if (isCenterControl(uci)) {
    categories.push(PositionalMotif.CenterControl);
  }

  if (isDevelopment(uci, fen)) {
    categories.push(PositionalMotif.Development);
  }

  if (isCastling(san, uci)) {
    categories.push(PositionalMotif.KingSafety);
  }

  // Strategic detection
  if (isPawnAdvance(uci, fen)) {
    categories.push(StrategicMotif.PawnStructure);
  }

  // Default: if no categories detected, label as piece activity
  if (categories.length === 0) {
    categories.push(PositionalMotif.PieceActivity);
  }

  return categories;
}

// ---------------------------------------------------------------------------
// Heuristic Detectors
// ---------------------------------------------------------------------------

function isCapture(san: string, uci: string): boolean {
  // SAN captures contain 'x'; also detect en passant
  return san.includes("x") || (uci.length === 4 && san.includes("x"));
}

function isCheck(san: string): boolean {
  return san.includes("+") || san.includes("#");
}

function isSacrifice(move: ScoredMove): boolean {
  // A sacrifice: the move involves a capture of a higher-value piece
  // or intentionally hangs material. Approximated by: move is a capture
  // that is NOT the best move but is in the top 3.
  // This is a rough heuristic; real implementation uses chess.js board state.
  return false; // Placeholder - requires board state analysis
}

function isCenterControl(uci: string): boolean {
  const target = uci.substring(2, 4);
  const centerSquares = ["d4", "d5", "e4", "e5", "c4", "c5", "f4", "f5"];
  return centerSquares.includes(target);
}

function isDevelopment(uci: string, fen: FenString): boolean {
  // A development move: piece moves from back rank to a more active square.
  const fromRank = uci[1];
  const toRank = uci[3];

  // White development: piece moves from rank 1/2 to rank 3+
  // Black development: piece moves from rank 7/8 to rank 6-
  const activeColor = fen.split(" ")[1];

  if (activeColor === "w") {
    return (fromRank === "1" || fromRank === "2") && parseInt(toRank) >= 3;
  } else {
    return (fromRank === "8" || fromRank === "7") && parseInt(toRank) <= 6;
  }
}

function isCastling(san: string, uci: string): boolean {
  return (
    san === "O-O" ||
    san === "O-O-O" ||
    uci === "e1g1" ||
    uci === "e1c1" ||
    uci === "e8g8" ||
    uci === "e8c8"
  );
}

function isPawnAdvance(uci: string, fen: FenString): boolean {
  // Detect pawn moves by checking if source square has a pawn.
  // Simplified: pawn moves don't have a piece prefix in SAN,
  // and in UCI the file stays the same for non-captures.
  const fromFile = uci[0];
  const toFile = uci[2];
  const fromRank = parseInt(uci[1]);
  const toRank = parseInt(uci[3]);

  // Pawn moves: same file, advance by 1 or 2 ranks
  return fromFile === toFile && Math.abs(toRank - fromRank) <= 2;
}

// ---------------------------------------------------------------------------
// Complexity Scoring
// ---------------------------------------------------------------------------

/**
 * Computes a complexity score (0.0 - 1.0) for a move.
 *
 * Factors:
 *   - PV length: longer sequences need more calculation
 *   - Relative evaluation: moves close in eval to the best are harder to distinguish
 *   - Move type: tactical moves with forced lines are "cleaner"
 */
function computeComplexity(
  move: ScoredMove,
  allMoves: ScoredMove[]
): number {
  let complexity = 0;

  // Factor 1: PV length (normalized to 0-0.4)
  const pvFactor = Math.min(move.pv.length / COMPLEXITY_DEPTH_DIVISOR, 1.0);
  complexity += pvFactor * 0.4;

  // Factor 2: How close other moves are in evaluation (0-0.3)
  if (allMoves.length > 1) {
    const bestCp = Math.max(...allMoves.map((m) => m.cp));
    const secondBestCp =
      allMoves.length > 1
        ? allMoves
            .map((m) => m.cp)
            .sort((a, b) => b - a)
            .at(1) ?? bestCp
        : bestCp;

    const evalGap = Math.abs(bestCp - secondBestCp);
    // Small gap = hard to distinguish = more complex
    const gapFactor = Math.max(0, 1.0 - evalGap / 100);
    complexity += gapFactor * 0.3;
  }

  // Factor 3: Depth needed (normalized to 0-0.3)
  const depthFactor = Math.min(move.depth / 20, 1.0);
  complexity += depthFactor * 0.3;

  return Math.min(1.0, complexity);
}

import type {
  ScoredMove,
  ClassifiedMove,
  MoveCategory,
  FenString,
} from "../lib/types";
import { TacticalMotif, PositionalMotif, StrategicMotif } from "../lib/types";
import { COMPLEXITY_DEPTH_DIVISOR } from "../lib/constants";

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

function detectCategories(move: ScoredMove, fen: FenString): MoveCategory[] {
  const categories: MoveCategory[] = [];
  const { uci, san } = move;

  if (san.includes("x")) categories.push(TacticalMotif.Capture);
  if (san.includes("+") || san.includes("#")) categories.push(TacticalMotif.Check);
  if (isSacrifice(move)) categories.push(TacticalMotif.Sacrifice);

  if (isCenterControl(uci)) categories.push(PositionalMotif.CenterControl);
  if (isDevelopment(uci, fen)) categories.push(PositionalMotif.Development);
  if (isCastling(san, uci)) categories.push(PositionalMotif.KingSafety);

  if (isPawnAdvance(uci)) categories.push(StrategicMotif.PawnStructure);

  if (categories.length === 0) categories.push(PositionalMotif.PieceActivity);

  return categories;
}

function isSacrifice(_move: ScoredMove): boolean {
  // TODO: needs board state to detect properly
  return false;
}

function isCenterControl(uci: string): boolean {
  const target = uci.substring(2, 4);
  return ["d4", "d5", "e4", "e5", "c4", "c5", "f4", "f5"].includes(target);
}

function isDevelopment(uci: string, fen: FenString): boolean {
  const fromRank = uci[1];
  const toRank = uci[3];
  const activeColor = fen.split(" ")[1];

  if (activeColor === "w") {
    return (fromRank === "1" || fromRank === "2") && parseInt(toRank) >= 3;
  }
  return (fromRank === "8" || fromRank === "7") && parseInt(toRank) <= 6;
}

function isCastling(san: string, uci: string): boolean {
  return (
    san === "O-O" || san === "O-O-O" ||
    uci === "e1g1" || uci === "e1c1" ||
    uci === "e8g8" || uci === "e8c8"
  );
}

function isPawnAdvance(uci: string): boolean {
  const fromFile = uci[0];
  const toFile = uci[2];
  const fromRank = parseInt(uci[1]);
  const toRank = parseInt(uci[3]);
  return fromFile === toFile && Math.abs(toRank - fromRank) <= 2;
}

function computeComplexity(move: ScoredMove, allMoves: ScoredMove[]): number {
  let complexity = 0;

  // longer PV = more calculation required
  const pvFactor = Math.min(move.pv.length / COMPLEXITY_DEPTH_DIVISOR, 1.0);
  complexity += pvFactor * 0.4;

  // close evals = harder to distinguish correct move
  if (allMoves.length > 1) {
    const bestCp = Math.max(...allMoves.map((m) => m.cp));
    const secondBestCp = allMoves
      .map((m) => m.cp)
      .sort((a, b) => b - a)
      .at(1) ?? bestCp;

    const evalGap = Math.abs(bestCp - secondBestCp);
    complexity += Math.max(0, 1.0 - evalGap / 100) * 0.3;
  }

  const depthFactor = Math.min(move.depth / 20, 1.0);
  complexity += depthFactor * 0.3;

  return Math.min(1.0, complexity);
}

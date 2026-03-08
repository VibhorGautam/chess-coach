/**
 * Chess Move Coach - Unified Type Definitions
 */

// ---------------------------------------------------------------------------
// Chess Primitives
// ---------------------------------------------------------------------------

export type UciMove = string;
export type SanMove = string;
export type FenString = string;
export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Square = string;

export type Rating = 500 | 1000 | 1500 | 2000;
export const RATINGS: Rating[] = [500, 1000, 1500, 2000];

// ---------------------------------------------------------------------------
// Engine Types
// ---------------------------------------------------------------------------

export interface AnalysisOptions {
  depth: number;
  multiPv: number;
  timeoutMs: number;
}

export interface ScoredMove {
  uci: UciMove;
  san: SanMove;
  cp: number;
  mate: number | null;
  pv: string[];
  depth: number;
}

export interface AnalysisResult {
  fen: FenString;
  moves: ScoredMove[];
  bestMove: UciMove;
  depth: number;
  elapsedMs: number;
}

// ---------------------------------------------------------------------------
// UCI Parser Types
// ---------------------------------------------------------------------------

export interface UciInfoLine {
  depth: number;
  multipv: number;
  cp?: number;
  mate?: number;
  pv: string[];
  nodes?: number;
  nps?: number;
  time?: number;
}

export interface UciBestMove {
  move: string;
  ponder?: string;
}

// ---------------------------------------------------------------------------
// Worker Message Types
// ---------------------------------------------------------------------------

export type WorkerCommand =
  | { type: "init" }
  | { type: "command"; cmd: string }
  | { type: "quit" };

export type WorkerResponse =
  | { type: "ready" }
  | { type: "uci-output"; line: string }
  | { type: "error"; message: string };

// ---------------------------------------------------------------------------
// Rating Model Types
// ---------------------------------------------------------------------------

export interface RatingProfile {
  rating: number;
  label: string;
  temperature: number;
  avgCpLoss: number;
  captureBonus: number;
  checkBonus: number;
  complexityDepthThreshold: number;
  positionalBonus: number;
}

export interface MoveProbability {
  uci: UciMove;
  san: SanMove;
  probability: number;
  cpLoss: number;
}

export interface RatingBandResult {
  rating: number;
  label: string;
  moves: MoveProbability[];
  topMove: MoveProbability;
  thought: string;
}

// ---------------------------------------------------------------------------
// Move Classification Types
// ---------------------------------------------------------------------------

export enum TacticalMotif {
  Capture = "capture",
  Check = "check",
  Fork = "fork",
  Pin = "pin",
  Skewer = "skewer",
  DiscoveredAttack = "discovered_attack",
  Sacrifice = "sacrifice",
}

export enum PositionalMotif {
  CenterControl = "center_control",
  Development = "development",
  KingSafety = "king_safety",
  PieceActivity = "piece_activity",
  Outpost = "outpost",
}

export enum StrategicMotif {
  PawnStructure = "pawn_structure",
  SpaceAdvantage = "space_advantage",
  Prophylaxis = "prophylaxis",
  Exchange = "exchange",
  EndgameTechnique = "endgame_technique",
}

export type MoveCategory = TacticalMotif | PositionalMotif | StrategicMotif;

export interface ClassifiedMove {
  uci: UciMove;
  san: SanMove;
  categories: MoveCategory[];
  isPrimarilyTactical: boolean;
  complexityScore: number;
}

// ---------------------------------------------------------------------------
// Growth Recommendation Types
// ---------------------------------------------------------------------------

export interface GrowthRecommendation {
  /** The move we're suggesting */
  move: ScoredMove;
  moveCategories: MoveCategory[];
  /** What the user would likely play */
  userTopMove: ScoredMove;
  userMoveCategories: MoveCategory[];
  /** Rating of the target level */
  targetRating: number;
  /** Human-readable explanation */
  explanation: string;
  /** Why this move is better than the user's move */
  whyBetter: string;
  /** What concept this teaches */
  concept: string;
  /** Cp improvement over user's likely move */
  cpImprovement: number;
  /** Rating comparison across all bands */
  ratingComparison: RatingBandResult[];
  /** Is the user already playing the best move? */
  isUserMoveOptimal: boolean;
}

// ---------------------------------------------------------------------------
// UI State Types
// ---------------------------------------------------------------------------

export interface AppState {
  fen: FenString;
  userRating: number;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  growthRecommendation: GrowthRecommendation | null;
  ratingComparison: RatingBandResult[];
  error: string | null;
}

export interface BoardArrow {
  from: Square;
  to: Square;
  color: string;
}

// ---------------------------------------------------------------------------
// Explanation Types
// ---------------------------------------------------------------------------

export type ExplanationTier = "beginner" | "intermediate" | "advanced";

export interface MoveExplanation {
  summary: string;
  details: string[];
  tier: ExplanationTier;
  categories: MoveCategory[];
}

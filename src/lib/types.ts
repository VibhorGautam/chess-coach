export type UciMove = string;
export type SanMove = string;
export type FenString = string;
export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Square = string;

export type Rating = 500 | 1000 | 1500 | 2000;
export const RATINGS: Rating[] = [500, 1000, 1500, 2000];

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

export type WorkerCommand =
  | { type: "init" }
  | { type: "command"; cmd: string }
  | { type: "quit" };

export type WorkerResponse =
  | { type: "ready" }
  | { type: "uci-output"; line: string }
  | { type: "error"; message: string };

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

export interface GrowthRecommendation {
  move: ScoredMove;
  moveCategories: MoveCategory[];
  userTopMove: ScoredMove;
  userMoveCategories: MoveCategory[];
  targetRating: number;
  explanation: string;
  whyBetter: string;
  concept: string;
  cpImprovement: number;
  ratingComparison: RatingBandResult[];
  isUserMoveOptimal: boolean;
}

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

export type ExplanationTier = "beginner" | "intermediate" | "advanced";

export interface MoveExplanation {
  summary: string;
  details: string[];
  tier: ExplanationTier;
  categories: MoveCategory[];
}

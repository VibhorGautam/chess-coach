# Chess Move Coach - System Architecture Document

## 1. Overview

Chess Move Coach is a browser-based application that suggests chess moves calibrated to a
player's rating level. Rather than showing engine-perfect moves, it surfaces what a slightly
better player would do -- a "growth move" approximately 30% above the user's current level.

All computation runs client-side. There is no backend server. Stockfish WASM executes in a
Web Worker, and the rating simulation model runs in the main thread using lightweight
probability calculations. For the initial build, a heuristic evaluator (chess.js-based)
demonstrates the full pipeline without requiring WASM setup.

## 2. Architecture Principles

- **Client-only**: Zero server dependencies. Stockfish WASM + JS models run entirely in-browser.
- **Typed contracts**: Every boundary uses TypeScript interfaces defined in `/src/lib/types.ts`.
- **Separation of concerns**: Engine, model, UI, and explanation layers are fully decoupled.
- **Under 500 lines per file**: Every source file stays focused on one responsibility.
- **Testable**: Pure functions for move scoring and explanation; side effects isolated to engine wrapper.

## 3. High-Level Data Flow

```
User Input (FEN + Rating)
        |
        v
+-------------------+
|  React Frontend   |  -- Board UI, rating selector, analysis panel
|  (app/page.tsx)   |
+-------------------+
        |
        | fen: string, userRating: number
        v
+-------------------+
|  Engine Analysis  |  -- Stockfish WASM (or heuristic fallback)
|  (engine/)        |  -- Returns: ScoredMove[] sorted by cp
+-------------------+
        |
        | ScoredMove[] { uci, san, cp, mate, pv, depth }
        v
+-------------------+
|  Growth Engine    |  -- Rating simulation + growth selection
|  (models/)        |
|                   |  1. computeMoveProbabilities() per rating band
|                   |  2. classifyMove() for each candidate
|                   |  3. findGrowthRecommendation()
+-------------------+
        |
        | GrowthRecommendation
        v
+-------------------+
|  Explanations     |  -- Human-readable reasoning, tiered by level
|  (lib/)           |  -- generateExplanation(), generateWhyBetter()
+-------------------+
        |
        v
   GrowthCard + RatingComparison + EngineLines
```

## 4. File Structure (Final)

```
chess-move-coach/
  package.json
  tsconfig.json
  next.config.ts
  postcss.config.mjs
  docs/
    architecture.md          <-- this file
  src/
    app/
      page.tsx               Main page: composes all UI components
      layout.tsx             Root layout with metadata
      globals.css            Tailwind + custom CSS properties
    engine/
      stockfish-worker.ts    Web Worker that loads Stockfish WASM
      stockfish-service.ts   Promise-based wrapper for Worker messaging
      uci-parser.ts          Parses UCI protocol into typed structures
    models/
      rating-profiles.ts     Profile data + interpolation for any rating
      move-probability.ts    P(move | rating) via Boltzmann softmax + biases
      complexity-classifier.ts  Move classification by category and complexity
      growth-engine.ts       Top-level orchestrator: analyzeAllRatings + findGrowthRecommendation
      growth-selector.ts     Lower-level growth candidate search (alternate entry point)
    lib/
      types.ts               All shared TypeScript interfaces and enums
      constants.ts           Engine defaults, rating bands, UI thresholds
      fen-utils.ts           FEN validation, parsing helpers
      explanations.ts        Tiered explanation generators (beginner/intermediate/advanced)
      explanation-engine.ts  Detailed MoveExplanation builder
      move-classifier.ts     Board-aware classification via chess.js
    components/
      ChessBoard.tsx         Interactive board with drag-drop, arrows, flip
      FenInput.tsx           FEN text input with validation + example positions
      RatingSelector.tsx     Range slider with gradient color + labels
      RatingSlider.tsx       Alternative rating slider component
      AnalysisPanel.tsx      Growth move display with explanation
      GrowthCard.tsx         Highlighted growth move card with visual diff
      RatingComparison.tsx   4-band "how each rating thinks" cards
      MoveExplanation.tsx    Detailed explanation renderer
      EngineLines.tsx        Raw engine evaluation lines with eval bar
      PositionSetup.tsx      Board + FEN + examples composition
```

## 5. Component Architecture

### 5.1 Engine Layer (`/src/engine/`)

| File                    | Lines | Responsibility                                    |
|-------------------------|-------|---------------------------------------------------|
| `stockfish-worker.ts`   | ~110  | Web Worker: loads WASM, proxies UCI commands       |
| `stockfish-service.ts`  | ~215  | Async API: initialize(), analyze(fen, options)     |
| `uci-parser.ts`         | ~182  | Parses `info` and `bestmove` lines, aggregates PVs|

The engine service exposes:

```typescript
class StockfishService {
  async initialize(): Promise<void>
  async analyze(fen: FenString, options?: Partial<AnalysisOptions>): Promise<AnalysisResult>
  destroy(): void
}
```

For the initial build, `page.tsx` includes a `simulateAnalysis()` function that uses chess.js
heuristics as a stand-in for Stockfish WASM. This demonstrates the full pipeline end-to-end
without requiring WASM binary setup.

### 5.2 Models Layer (`/src/models/`)

| File                       | Lines | Responsibility                                  |
|----------------------------|-------|------------------------------------------------|
| `rating-profiles.ts`       | ~157  | Rating profiles + interpolation + thinking patterns |
| `move-probability.ts`      | ~135  | Boltzmann softmax with attractiveness multipliers  |
| `complexity-classifier.ts` | ~243  | Heuristic move classification from UCI/SAN         |
| `growth-engine.ts`         | ~120  | Top-level: analyzeAllRatings + findGrowthRecommendation |
| `growth-selector.ts`       | ~240  | Detailed growth candidate search (alternate path)  |

#### Rating Simulation Model

The core formula for move probability at a given rating:

```
P(move | rating) proportional to attractiveness(move) * exp(-cpLoss / temperature(rating))
```

Where `temperature(rating)` is calibrated per rating band:

| Rating | Temperature | Avg CP Loss | Capture Bonus | Check Bonus | Positional Bonus |
|--------|-------------|-------------|---------------|-------------|------------------|
| 500    | 300         | 200         | 0.35          | 0.25        | 0.00             |
| 1000   | 150         | 100         | 0.20          | 0.18        | 0.08             |
| 1500   | 75          | 50          | 0.03          | 0.05        | 0.18             |
| 2000   | 30          | 20          | 0.00          | 0.00        | 0.22             |

Attractiveness multipliers reflect human biases:
- Captures get `1 + captureBonus * 2` multiplier (beginners love captures)
- Checks get `1 + checkBonus * 2.5` multiplier (beginners love checks)
- Positional moves get `1 + positionalBonus * 2` (experts see quiet improvements)
- Complex moves (high complexity score) get penalized for players with low `complexityDepthThreshold`

#### Growth Move Algorithm

1. Compute `rankMovesForRating(moves, fen, userProfile)` -- what user would play.
2. Compute `rankMovesForRating(moves, fen, targetProfile)` where `target = rating * 1.3`.
3. If user and target would play the same move, try `rating + 400` to find divergence.
4. Classify both moves. Generate tiered explanation.
5. If target's move is outside comprehension range (`cpLoss > 2 * avgCpLoss`), find simpler alternative.
6. Return `GrowthRecommendation` with explanation, concept, and rating comparison.

### 5.3 Library Layer (`/src/lib/`)

| File                      | Lines | Responsibility                                  |
|---------------------------|-------|------------------------------------------------|
| `types.ts`                | ~208  | All shared interfaces, enums, type aliases      |
| `constants.ts`            | ~185  | Engine defaults, rating profiles, UI constants  |
| `fen-utils.ts`            | ~208  | FEN validation, parsing, position phase detect  |
| `explanations.ts`         | ~181  | Tiered explanation generators by category       |
| `explanation-engine.ts`   | ~230  | Detailed MoveExplanation builder                |
| `move-classifier.ts`      | ~165  | Board-aware classification via chess.js         |

#### Move Classification Taxonomy

```
MoveCategory:
  TacticalMotif:    capture, check, fork, pin, skewer, discovered_attack, sacrifice
  PositionalMotif:  center_control, development, king_safety, piece_activity, outpost
  StrategicMotif:   pawn_structure, space_advantage, prophylaxis, exchange, endgame_technique
```

#### Explanation Tiers

Three tiers keyed to user rating:

- **Beginner (< 800)**: Concrete, action-oriented. "This takes a piece!"
- **Intermediate (800-1400)**: Introduces concepts. "This exchange improves your structure."
- **Advanced (1400+)**: Strategic reasoning. "This quiet move optimizes piece coordination."

Each tier has per-category generators for `generateExplanation()`, `generateWhyBetter()`,
and `deriveConcept()`.

### 5.4 Components Layer (`/src/components/`)

| File                    | Responsibility                                           |
|-------------------------|----------------------------------------------------------|
| `ChessBoard.tsx`        | Interactive board: drag-drop, arrows, flip, undo, reset  |
| `FenInput.tsx`          | FEN text input with validation + 6 example positions     |
| `RatingSelector.tsx`    | Gradient range slider, rating label, color-coded value   |
| `GrowthCard.tsx`        | Growth move display: user move vs growth move with arrow  |
| `RatingComparison.tsx`  | 4-card grid showing each band's top move + thought bubble|
| `EngineLines.tsx`       | Top 5 engine lines with eval bar visualization           |
| `AnalysisPanel.tsx`     | Wrapper for growth move + explanation display             |
| `MoveExplanation.tsx`   | Detailed explanation with category tags                   |

### 5.5 App Layer (`/src/app/`)

| File            | Responsibility                                            |
|-----------------|-----------------------------------------------------------|
| `page.tsx`      | Main page: state management, analysis orchestration, layout|
| `layout.tsx`    | Root HTML layout, metadata, dark theme                     |
| `globals.css`   | Tailwind imports, CSS variables, custom slider/eval styles |

## 6. Key Interfaces

```typescript
// Core analysis types
interface ScoredMove {
  uci: UciMove;       // "e2e4"
  san: SanMove;       // "e4"
  cp: number;         // centipawn evaluation
  mate: number | null;
  pv: string[];       // principal variation
  depth: number;
}

interface AnalysisResult {
  fen: FenString;
  moves: ScoredMove[];
  bestMove: UciMove;
  depth: number;
  elapsedMs: number;
}

// Rating model types
interface RatingProfile {
  rating: number;
  label: string;
  temperature: number;
  avgCpLoss: number;
  captureBonus: number;
  checkBonus: number;
  complexityDepthThreshold: number;
  positionalBonus: number;
}

interface MoveProbability {
  uci: UciMove;
  san: SanMove;
  probability: number;
  cpLoss: number;
}

interface RatingBandResult {
  rating: number;
  label: string;
  moves: MoveProbability[];
  topMove: MoveProbability;
  thought: string;
}

// Growth recommendation
interface GrowthRecommendation {
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
```

## 7. Technology Stack

| Layer        | Technology              | Rationale                                    |
|--------------|-------------------------|----------------------------------------------|
| Framework    | Next.js 15 (App Router) | SSG for shell, client-side for engine         |
| Language     | TypeScript 5.7+         | Type safety across all layers                 |
| Chess Logic  | chess.js 1.0            | Move validation, FEN/PGN, board-state queries |
| Board UI     | react-chessboard 4.7    | Maintained, drag-drop, arrow overlays         |
| Engine       | Stockfish WASM          | Full Stockfish in browser via Web Worker      |
| Styling      | Tailwind CSS 4.0        | Utility-first, dark theme, responsive         |
| State        | React useState          | Minimal state, no external store needed       |
| Testing      | Jest + ts-jest          | Standard test runner for the ecosystem        |

## 8. Deployment Architecture

```
[next build]
      |
      v
[CDN / Vercel Edge]  -- HTML, JS, CSS, WASM binary
      |
      v
[Browser]
  |- Main Thread:  React UI + Rating Models + Explanation Engine
  |- Web Worker:   Stockfish WASM (or heuristic fallback)
```

CORS headers configured for SharedArrayBuffer support:
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

No server, no database, no API keys. The entire application is a static site.

## 9. Performance Characteristics

- **Heuristic analysis**: < 50ms (chess.js material counting)
- **Stockfish WASM depth 18**: 1-3 seconds on modern hardware
- **Rating probability calc**: O(N * B) where N = moves, B = rating bands
- **Explanation generation**: O(1), template-based lookups
- **Total time**: < 5 seconds with Stockfish; < 200ms with heuristic

## 10. Security Considerations

- No user data leaves the browser
- No authentication or session management
- FEN input validated before use (validateFen in fen-utils.ts)
- Web Worker communication uses structured clone (no eval)
- CORS headers configured for WASM SharedArrayBuffer only

## 11. Future Extensions

- **Stockfish WASM integration**: Replace heuristic evaluator with full Stockfish
- **PGN game import**: Analyze full games move-by-move
- **Lichess/Chess.com API**: Auto-detect user rating
- **Opening book overlay**: Show how moves relate to named openings
- **Progress tracking**: Local storage for repeated analysis sessions
- **Puzzle mode**: Present positions and test if user finds the growth move
- **Mobile optimization**: Touch-friendly board, responsive layout

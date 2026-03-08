"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import type {
  AnalysisResult,
  GrowthRecommendation,
  RatingBandResult,
  ScoredMove,
  BoardArrow,
  UciInfoLine,
} from "@/lib/types";
import { STARTING_FEN } from "@/lib/fen-utils";
import { ARROW_COLORS } from "@/lib/constants";
import { parseInfoLine, parseBestMove, aggregateMultiPv, getUnifiedCp } from "@/engine/uci-parser";
import RatingSelector from "@/components/RatingSelector";
import FenInput from "@/components/FenInput";
import RatingComparison from "@/components/RatingComparison";
import GrowthCard from "@/components/GrowthCard";
import EngineLines from "@/components/EngineLines";

const ChessBoard = dynamic(() => import("@/components/ChessBoard"), {
  ssr: false,
  loading: () => (
    <div className="w-[480px] h-[480px] rounded-lg bg-gray-800/50 animate-pulse flex items-center justify-center">
      <span className="text-gray-600 text-sm">Loading board...</span>
    </div>
  ),
});

type EngineStatus = "not-loaded" | "loading" | "ready" | "analyzing" | "error";

// ---------------------------------------------------------------------------
// Heuristic fallback evaluator (when WASM isn't available)
// ---------------------------------------------------------------------------
function heuristicAnalysis(fen: string): AnalysisResult {
  const start = performance.now();
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });

  const scored: ScoredMove[] = moves.map((m) => {
    const test = new Chess(fen);
    test.move(m.san);
    let cp = 0;

    const pieces = test.board().flat().filter(Boolean);
    for (const p of pieces) {
      if (!p) continue;
      const val: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
      cp += p.color === "w" ? (val[p.type] ?? 0) : -(val[p.type] ?? 0);
    }

    if (m.captured) {
      const captureVal: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
      cp += chess.turn() === "w" ? (captureVal[m.captured] ?? 0) * 0.1 : -(captureVal[m.captured] ?? 0) * 0.1;
    }
    if (test.inCheck()) cp += chess.turn() === "w" ? 30 : -30;
    if (m.san === "O-O" || m.san === "O-O-O") cp += chess.turn() === "w" ? 40 : -40;
    if (["d4", "d5", "e4", "e5"].includes(m.to)) cp += chess.turn() === "w" ? 15 : -15;
    if (["n", "b"].includes(m.piece)) {
      const fr = parseInt(m.from[1]);
      if ((chess.turn() === "w" && fr <= 2) || (chess.turn() === "b" && fr >= 7))
        cp += chess.turn() === "w" ? 20 : -20;
    }
    const opp = test.moves().length;
    cp += chess.turn() === "w" ? -opp * 0.5 : opp * 0.5;
    if (test.isCheckmate()) {
      return { uci: m.from + m.to + (m.promotion || ""), san: m.san, cp: 10000, mate: 1, pv: [m.san], depth: 8 };
    }
    if (chess.turn() === "b") cp = -cp;
    return { uci: m.from + m.to + (m.promotion || ""), san: m.san, cp: Math.round(cp), mate: null, pv: [m.san], depth: 8 };
  });

  scored.sort((a, b) => b.cp - a.cp);
  return { fen, moves: scored, bestMove: scored[0]?.uci || "", depth: 8, elapsedMs: performance.now() - start };
}

// ---------------------------------------------------------------------------
// How-To Guide Component
// ---------------------------------------------------------------------------
function HowToGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/40 p-6 backdrop-blur">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-bold text-white">How Chess Coach Works</h2>
        <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 text-sm">
          Hide
        </button>
      </div>

      <div className="space-y-4 text-sm">
        {/* The Problem */}
        <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
          <h3 className="font-semibold text-pink-400 mb-1">The Problem</h3>
          <p className="text-gray-400 leading-relaxed">
            Chess engines suggest moves that are 100% optimal, but as a human, you can&apos;t understand <em>why</em> the engine chose that move.
            A 1000-rated player doesn&apos;t need to play like Stockfish. They need to play like a <strong className="text-gray-200">1200-rated player</strong>.
          </p>
        </div>

        {/* The Solution */}
        <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
          <h3 className="font-semibold text-green-400 mb-1">The Solution</h3>
          <p className="text-gray-400 leading-relaxed">
            Chess Coach shows you what players at <strong className="text-gray-200">500, 1000, 1500, and 2000</strong> ELO would play in your exact position.
            Then it suggests a <strong className="text-pink-300">growth move</strong>: a move that&apos;s <strong className="text-gray-200">~30% better</strong> than what you&apos;d play, not 100% engine-best.
            A move you can actually <em>understand</em> and <em>learn from</em>.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <span className="text-blue-400 font-bold text-lg mt-0.5">1</span>
            <div>
              <p className="font-medium text-gray-200 text-xs">Set up position</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Drag pieces on the board, paste a FEN, or click an example opening</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
            <span className="text-yellow-400 font-bold text-lg mt-0.5">2</span>
            <div>
              <p className="font-medium text-gray-200 text-xs">Set your rating</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Slide to your ELO (500-2000). This calibrates the suggestions to your level</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-pink-500/5 border border-pink-500/10">
            <span className="text-pink-400 font-bold text-lg mt-0.5">3</span>
            <div>
              <p className="font-medium text-gray-200 text-xs">Click Analyze</p>
              <p className="text-gray-500 text-[11px] mt-0.5">See how each rating thinks, and get your personalized growth move</p>
            </div>
          </div>
        </div>

        {/* Powered by */}
        <p className="text-[11px] text-gray-600 text-center pt-1">
          Powered by Stockfish 18 WASM + Boltzmann rating simulation model inspired by MAIA Chess research
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function Home() {
  const [fen, setFen] = useState(STARTING_FEN);
  const [userRating, setUserRating] = useState(1000);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("not-loaded");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [growthRec, setGrowthRec] = useState<GrowthRecommendation | null>(null);
  const [ratingComps, setRatingComps] = useState<RatingBandResult[]>([]);
  const [showGuide, setShowGuide] = useState(true);
  const [analysisDepth, setAnalysisDepth] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const uciLinesRef = useRef<string[]>([]);
  const resolveAnalysisRef = useRef<((result: AnalysisResult) => void) | null>(null);
  const analysisStartRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Initialize Stockfish WASM engine
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    setEngineStatus("loading");
    try {
      const worker = new Worker("/stockfish/worker.js");

      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "uci-output") {
          const line: string = msg.line;

          // Track "uciok" as ready signal
          if (line === "uciok" || line === "readyok") {
            if (engineStatus !== "ready") {
              setEngineStatus("ready");
              // Configure engine
              worker.postMessage({ type: "command", cmd: "setoption name MultiPV value 8" });
              worker.postMessage({ type: "command", cmd: "isready" });
            }
            return;
          }

          // Collect info lines during analysis
          if (line.startsWith("info") && line.includes(" pv ")) {
            uciLinesRef.current.push(line);

            // Update depth display
            const depthMatch = line.match(/depth (\d+)/);
            if (depthMatch) {
              const d = parseInt(depthMatch[1]);
              if (d > analysisDepth) setAnalysisDepth(d);
            }
          }

          // Analysis complete
          if (line.startsWith("bestmove")) {
            const parsed = aggregateMultiPv(uciLinesRef.current);
            const chess = new Chess(fen);
            const legalMoves = chess.moves({ verbose: true });

            const moves: ScoredMove[] = parsed.map((info) => {
              const uci = info.pv[0];
              const m = legalMoves.find(
                (lm) => lm.from + lm.to + (lm.promotion || "") === uci
              );
              return {
                uci,
                san: m?.san || uci,
                cp: getUnifiedCp(info),
                mate: info.mate ?? null,
                pv: info.pv,
                depth: info.depth,
              };
            }).sort((a, b) => b.cp - a.cp);

            const bestMove = parseBestMove(line);
            const result: AnalysisResult = {
              fen,
              moves,
              bestMove: bestMove?.move || moves[0]?.uci || "",
              depth: moves[0]?.depth || 18,
              elapsedMs: performance.now() - analysisStartRef.current,
            };

            resolveAnalysisRef.current?.(result);
            resolveAnalysisRef.current = null;
          }
        }

        if (msg.type === "error") {
          console.error("[Stockfish]", msg.message);
          setEngineStatus("error");
        }
      };

      worker.onerror = () => {
        setEngineStatus("error");
      };

      worker.postMessage({ type: "init" });
      workerRef.current = worker;
    } catch {
      setEngineStatus("error");
    }

    return () => {
      workerRef.current?.postMessage({ type: "quit" });
      workerRef.current?.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Analyze with real Stockfish or fallback
  // ---------------------------------------------------------------------------
  const runStockfishAnalysis = useCallback(
    (position: string): Promise<AnalysisResult> => {
      return new Promise((resolve) => {
        if (engineStatus !== "ready" || !workerRef.current) {
          // Fallback to heuristic
          resolve(heuristicAnalysis(position));
          return;
        }

        uciLinesRef.current = [];
        analysisStartRef.current = performance.now();
        setAnalysisDepth(0);

        resolveAnalysisRef.current = resolve;
        workerRef.current.postMessage({ type: "command", cmd: `position fen ${position}` });
        workerRef.current.postMessage({ type: "command", cmd: "go depth 18" });

        // Safety timeout: if engine hangs, fall back to heuristic
        setTimeout(() => {
          if (resolveAnalysisRef.current) {
            workerRef.current?.postMessage({ type: "command", cmd: "stop" });
            // Give it 500ms to respond with bestmove after stop
            setTimeout(() => {
              if (resolveAnalysisRef.current) {
                resolveAnalysisRef.current(heuristicAnalysis(position));
                resolveAnalysisRef.current = null;
              }
            }, 500);
          }
        }, 12000);
      });
    },
    [engineStatus]
  );

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setGrowthRec(null);
    setRatingComps([]);
    setAnalysisResult(null);

    try {
      const result = await runStockfishAnalysis(fen);
      setAnalysisResult(result);

      const { analyzeAllRatings, findGrowthRecommendation } = await import("@/models/growth-engine");
      const comparisons = analyzeAllRatings(result.moves, fen);
      setRatingComps(comparisons);

      const recommendation = findGrowthRecommendation(result.moves, fen, userRating);
      setGrowthRec(recommendation);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [fen, userRating, runStockfishAnalysis]);

  // Build arrows for the board
  const arrows = useMemo<BoardArrow[]>(() => {
    const result: BoardArrow[] = [];
    if (!growthRec) return result;

    if (growthRec.userTopMove.uci.length >= 4) {
      result.push({
        from: growthRec.userTopMove.uci.substring(0, 2),
        to: growthRec.userTopMove.uci.substring(2, 4),
        color: ARROW_COLORS.userMove,
      });
    }

    if (!growthRec.isUserMoveOptimal && growthRec.move.uci.length >= 4) {
      result.push({
        from: growthRec.move.uci.substring(0, 2),
        to: growthRec.move.uci.substring(2, 4),
        color: ARROW_COLORS.growthMove,
      });
    }

    return result;
  }, [growthRec]);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setGrowthRec(null);
    setRatingComps([]);
  }, []);

  const engineLabel =
    engineStatus === "ready" ? "Stockfish 18" :
    engineStatus === "loading" ? "Loading engine..." :
    engineStatus === "error" ? "Heuristic mode" : "Not loaded";

  return (
    <div className="min-h-screen">
      {/* Gradient top bar */}
      <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Chess Coach
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Not engine-best. <span className="text-pink-400 font-semibold">30% better</span> than your level.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
                engineStatus === "ready"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : engineStatus === "loading"
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  engineStatus === "ready" ? "bg-green-400" :
                  engineStatus === "loading" ? "bg-yellow-400 animate-pulse" : "bg-gray-400"
                }`} />
                {engineLabel}
              </div>
              {!showGuide && (
                <button
                  onClick={() => setShowGuide(true)}
                  className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  How it works
                </button>
              )}
            </div>
          </div>
        </header>

        {/* How-to Guide */}
        {showGuide && !analysisResult && (
          <div className="mb-6">
            <HowToGuide onDismiss={() => setShowGuide(false)} />
          </div>
        )}

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Board + Controls */}
          <div className="flex flex-col gap-4 lg:w-[520px] flex-shrink-0">
            <ChessBoard
              fen={fen}
              onFenChange={(newFen) => { setFen(newFen); clearAnalysis(); }}
              arrows={arrows}
              boardWidth={480}
            />

            <FenInput fen={fen} onFenChange={(newFen) => { setFen(newFen); clearAnalysis(); }} />

            <RatingSelector rating={userRating} onChange={setUserRating} />

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all ${
                isAnalyzing
                  ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 active:scale-[0.99]"
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-white rounded-full" />
                  Analyzing{analysisDepth > 0 ? ` (depth ${analysisDepth})` : ""}...
                </span>
              ) : (
                "Analyze Position"
              )}
            </button>

            {/* Engine info below button */}
            {analysisResult && (
              <div className="rounded-xl border border-gray-800/50 bg-gray-900/30 p-3">
                <EngineLines result={analysisResult} isAnalyzing={isAnalyzing} />
              </div>
            )}
          </div>

          {/* Right: Analysis Results */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Growth Move Card */}
            {growthRec && (
              <GrowthCard recommendation={growthRec} userRating={userRating} />
            )}

            {/* Rating Comparison */}
            {ratingComps.length > 0 && (
              <div className="rounded-xl border border-gray-800/50 bg-gray-900/30 p-4">
                <RatingComparison comparisons={ratingComps} userRating={userRating} />
              </div>
            )}

            {/* Arrow Legend */}
            {growthRec && !growthRec.isUserMoveOptimal && (
              <div className="flex items-center gap-4 text-[11px] text-gray-500 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: ARROW_COLORS.userMove }} />
                  Your likely move
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: ARROW_COLORS.growthMove }} />
                  Growth move
                </span>
              </div>
            )}

            {/* Empty state when no analysis */}
            {!analysisResult && !isAnalyzing && !showGuide && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4 opacity-20">&#9816;</div>
                <h2 className="text-lg font-semibold text-gray-400 mb-2">
                  Ready to Coach
                </h2>
                <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                  Set up a position on the board, select your rating, and click{" "}
                  <span className="text-pink-400 font-medium">Analyze</span> to see how
                  different-rated players would think about this position.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-4 border-t border-gray-800/50 flex items-center justify-between text-[10px] text-gray-700">
          <span>
            Chess Coach | Move suggestions calibrated to your level. Inspired by{" "}
            <span className="text-gray-500">MAIA Chess</span> research.
          </span>
          <span>Stockfish 18 WASM | Boltzmann Rating Model</span>
        </footer>
      </div>
    </div>
  );
}

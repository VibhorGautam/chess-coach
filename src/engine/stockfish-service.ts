/**
 * Chess Move Coach - Stockfish Service
 *
 * Promise-based wrapper around the Stockfish Web Worker.
 * Provides a clean async API for position analysis.
 *
 * Usage:
 *   const service = new StockfishService();
 *   await service.initialize();
 *   const result = await service.analyze("rnbqkbnr/...", { depth: 18, multiPv: 8 });
 */

import type {
  AnalysisOptions,
  AnalysisResult,
  FenString,
  ScoredMove,
  UciInfoLine,
} from "../lib/types";
import {
  DEFAULT_DEPTH,
  DEFAULT_MULTI_PV,
  DEFAULT_TIMEOUT_MS,
} from "../lib/constants";
import { aggregateMultiPv, getUnifiedCp, parseBestMove } from "./uci-parser";

// ---------------------------------------------------------------------------
// Service Class
// ---------------------------------------------------------------------------

export class StockfishService {
  private worker: Worker | null = null;
  private isReady = false;
  private uciLines: string[] = [];
  private resolveReady: (() => void) | null = null;
  private resolveBestMove: ((move: string) => void) | null = null;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Creates and initializes the Stockfish Web Worker.
   * Resolves when the engine is ready to accept commands.
   */
  async initialize(): Promise<void> {
    if (this.isReady) return;

    return new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL("./stockfish-worker.ts", import.meta.url),
          { type: "module" }
        );

        this.resolveReady = resolve;

        this.worker.onmessage = (event: MessageEvent) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          reject(new Error(`Worker error: ${error.message}`));
        };

        this.worker.postMessage({ type: "init" });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Terminates the Web Worker and releases resources.
   */
  destroy(): void {
    if (this.worker) {
      this.worker.postMessage({ type: "quit" });
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
  }

  // -------------------------------------------------------------------------
  // Analysis
  // -------------------------------------------------------------------------

  /**
   * Analyzes a chess position and returns scored candidate moves.
   *
   * @param fen    - Position in FEN notation.
   * @param options - Analysis depth, multi-PV count, timeout.
   * @returns        AnalysisResult with scored moves sorted by evaluation.
   */
  async analyze(
    fen: FenString,
    options?: Partial<AnalysisOptions>
  ): Promise<AnalysisResult> {
    if (!this.worker || !this.isReady) {
      throw new Error("Engine not initialized. Call initialize() first.");
    }

    const depth = options?.depth ?? DEFAULT_DEPTH;
    const multiPv = options?.multiPv ?? DEFAULT_MULTI_PV;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // Reset line collection
    this.uciLines = [];

    // Configure multi-PV
    this.sendCommand(`setoption name MultiPV value ${multiPv}`);

    // Set position
    this.sendCommand(`position fen ${fen}`);

    // Start analysis and wait for bestmove
    const startTime = performance.now();
    const bestMoveUci = await this.goAndWait(depth, timeoutMs);
    const elapsedMs = performance.now() - startTime;

    // Parse collected info lines
    const pvResults = aggregateMultiPv(this.uciLines);

    // Convert to ScoredMove[]
    const moves = this.buildScoredMoves(pvResults);

    return {
      fen,
      moves,
      bestMove: bestMoveUci,
      depth,
      elapsedMs,
    };
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  /**
   * Sends a raw UCI command to the worker.
   */
  private sendCommand(cmd: string): void {
    this.worker?.postMessage({ type: "command", cmd });
  }

  /**
   * Issues a `go` command and resolves when `bestmove` is received.
   * Rejects on timeout.
   */
  private goAndWait(depth: number, timeoutMs: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.sendCommand("stop");
        reject(new Error(`Analysis timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.resolveBestMove = (move: string) => {
        clearTimeout(timer);
        resolve(move);
      };

      this.sendCommand(`go depth ${depth}`);
    });
  }

  /**
   * Handles all messages from the Web Worker.
   */
  private handleWorkerMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case "ready":
        this.isReady = true;
        this.resolveReady?.();
        this.resolveReady = null;
        break;

      case "uci-output": {
        const line = msg.line as string;
        this.uciLines.push(line);

        // Check for bestmove
        const bestMove = parseBestMove(line);
        if (bestMove && this.resolveBestMove) {
          this.resolveBestMove(bestMove.move);
          this.resolveBestMove = null;
        }
        break;
      }

      case "error":
        console.error("[StockfishService]", msg.message);
        break;
    }
  }

  /**
   * Converts parsed UCI info lines into ScoredMove objects.
   * Sorts by evaluation (best first).
   */
  private buildScoredMoves(pvResults: UciInfoLine[]): ScoredMove[] {
    return pvResults
      .map((info) => ({
        uci: info.pv[0],
        san: info.pv[0], // SAN conversion happens in the model layer via chess.js
        cp: getUnifiedCp(info),
        mate: info.mate ?? null,
        pv: info.pv,
        depth: info.depth,
      }))
      .sort((a, b) => b.cp - a.cp);
  }
}

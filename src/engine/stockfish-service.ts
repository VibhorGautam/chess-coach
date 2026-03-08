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

export class StockfishService {
  private worker: Worker | null = null;
  private isReady = false;
  private uciLines: string[] = [];
  private resolveReady: (() => void) | null = null;
  private resolveBestMove: ((move: string) => void) | null = null;

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

  destroy(): void {
    if (this.worker) {
      this.worker.postMessage({ type: "quit" });
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
  }

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

    this.uciLines = [];
    this.sendCommand(`setoption name MultiPV value ${multiPv}`);
    this.sendCommand(`position fen ${fen}`);

    const startTime = performance.now();
    const bestMoveUci = await this.goAndWait(depth, timeoutMs);
    const elapsedMs = performance.now() - startTime;

    const pvResults = aggregateMultiPv(this.uciLines);
    const moves = this.buildScoredMoves(pvResults);

    return { fen, moves, bestMove: bestMoveUci, depth, elapsedMs };
  }

  private sendCommand(cmd: string): void {
    this.worker?.postMessage({ type: "command", cmd });
  }

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

  private buildScoredMoves(pvResults: UciInfoLine[]): ScoredMove[] {
    return pvResults
      .map((info) => ({
        uci: info.pv[0],
        san: info.pv[0],
        cp: getUnifiedCp(info),
        mate: info.mate ?? null,
        pv: info.pv,
        depth: info.depth,
      }))
      .sort((a, b) => b.cp - a.cp);
  }
}

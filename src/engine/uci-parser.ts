/**
 * Chess Move Coach - UCI Protocol Parser
 *
 * Parses raw UCI (Universal Chess Interface) protocol output from
 * Stockfish into typed data structures. Handles `info` lines with
 * multi-PV data and `bestmove` responses.
 */

import type { UciInfoLine, UciBestMove } from "../lib/types";

// ---------------------------------------------------------------------------
// Info Line Parsing
// ---------------------------------------------------------------------------

/**
 * Parses a single UCI `info` line into a structured object.
 *
 * Example input:
 *   "info depth 18 multipv 1 score cp 35 nodes 1234567 nps 2000000 pv e2e4 e7e5 g1f3"
 *
 * Returns null if the line is not a valid info line with PV data.
 */
export function parseInfoLine(line: string): UciInfoLine | null {
  if (!line.startsWith("info ")) return null;

  const tokens = line.split(/\s+/);
  const result: Partial<UciInfoLine> = {};

  let i = 1; // skip "info"
  while (i < tokens.length) {
    switch (tokens[i]) {
      case "depth":
        result.depth = parseInt(tokens[++i], 10);
        break;

      case "multipv":
        result.multipv = parseInt(tokens[++i], 10);
        break;

      case "score":
        i++;
        if (tokens[i] === "cp") {
          result.cp = parseInt(tokens[++i], 10);
        } else if (tokens[i] === "mate") {
          result.mate = parseInt(tokens[++i], 10);
        }
        break;

      case "nodes":
        result.nodes = parseInt(tokens[++i], 10);
        break;

      case "nps":
        result.nps = parseInt(tokens[++i], 10);
        break;

      case "time":
        result.time = parseInt(tokens[++i], 10);
        break;

      case "pv":
        // Everything after "pv" is the principal variation
        result.pv = tokens.slice(i + 1);
        i = tokens.length; // exit loop
        break;

      default:
        break;
    }
    i++;
  }

  // Only return results that have meaningful analysis data
  if (
    result.depth !== undefined &&
    result.pv !== undefined &&
    result.pv.length > 0 &&
    (result.cp !== undefined || result.mate !== undefined)
  ) {
    return {
      depth: result.depth,
      multipv: result.multipv ?? 1,
      cp: result.cp,
      mate: result.mate,
      pv: result.pv,
      nodes: result.nodes,
      nps: result.nps,
      time: result.time,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Best Move Parsing
// ---------------------------------------------------------------------------

/**
 * Parses a UCI `bestmove` line.
 *
 * Example input:
 *   "bestmove e2e4 ponder e7e5"
 *
 * Returns null if the line is not a valid bestmove response.
 */
export function parseBestMove(line: string): UciBestMove | null {
  if (!line.startsWith("bestmove ")) return null;

  const tokens = line.split(/\s+/);
  if (tokens.length < 2) return null;

  const result: UciBestMove = {
    move: tokens[1],
  };

  if (tokens.length >= 4 && tokens[2] === "ponder") {
    result.ponder = tokens[3];
  }

  return result;
}

// ---------------------------------------------------------------------------
// Multi-PV Aggregation
// ---------------------------------------------------------------------------

/**
 * Collects info lines from a stream of UCI output, keeping only the
 * highest-depth result for each multi-PV index.
 *
 * UCI engines emit info lines at increasing depths. We want the final
 * (deepest) result for each PV slot.
 *
 * @param lines Array of raw UCI output lines.
 * @returns Array of UciInfoLine sorted by multipv index (1-based).
 */
export function aggregateMultiPv(lines: string[]): UciInfoLine[] {
  const pvMap = new Map<number, UciInfoLine>();

  for (const line of lines) {
    const info = parseInfoLine(line);
    if (!info) continue;

    const existing = pvMap.get(info.multipv);
    if (!existing || info.depth > existing.depth) {
      pvMap.set(info.multipv, info);
    }
  }

  return Array.from(pvMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, info]) => info);
}

// ---------------------------------------------------------------------------
// Score Normalization
// ---------------------------------------------------------------------------

/**
 * Converts a mate score to a centipawn-equivalent for comparison purposes.
 * Mate in N is treated as +/- 10000 with a small adjustment for N
 * so that faster mates rank higher.
 */
export function mateScoreToCp(mateInN: number): number {
  if (mateInN > 0) {
    return 10_000 - mateInN;
  } else {
    return -10_000 - mateInN;
  }
}

/**
 * Returns a unified centipawn score from an info line,
 * converting mate scores as needed.
 */
export function getUnifiedCp(info: UciInfoLine): number {
  if (info.cp !== undefined) return info.cp;
  if (info.mate !== undefined) return mateScoreToCp(info.mate);
  return 0;
}

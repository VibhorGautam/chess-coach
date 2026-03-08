import type { UciInfoLine, UciBestMove } from "../lib/types";

export function parseInfoLine(line: string): UciInfoLine | null {
  if (!line.startsWith("info ")) return null;

  const tokens = line.split(/\s+/);
  const result: Partial<UciInfoLine> = {};

  let i = 1;
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
        result.pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
      default:
        break;
    }
    i++;
  }

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

export function parseBestMove(line: string): UciBestMove | null {
  if (!line.startsWith("bestmove ")) return null;

  const tokens = line.split(/\s+/);
  if (tokens.length < 2) return null;

  const result: UciBestMove = { move: tokens[1] };
  if (tokens.length >= 4 && tokens[2] === "ponder") {
    result.ponder = tokens[3];
  }

  return result;
}

/**
 * Keeps only the highest-depth result for each multi-PV slot.
 * Engines emit info lines at increasing depths; we want the final one per slot.
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

// Mate in N -> centipawn equivalent (faster mates rank higher)
export function mateScoreToCp(mateInN: number): number {
  return mateInN > 0 ? 10_000 - mateInN : -10_000 - mateInN;
}

export function getUnifiedCp(info: UciInfoLine): number {
  if (info.cp !== undefined) return info.cp;
  if (info.mate !== undefined) return mateScoreToCp(info.mate);
  return 0;
}

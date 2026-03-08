import type { Color, FenString } from "./types";

export const STARTING_FEN: FenString =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const VALID_PIECE_CHARS = new Set("rnbqkpRNBQKP".split(""));
const VALID_ACTIVE_COLOR = new Set(["w", "b"]);
const CASTLING_REGEX = /^(-|[KQkq]{1,4})$/;
const EN_PASSANT_REGEX = /^(-|[a-h][36])$/;

export function validateFen(fen: string): { valid: boolean; error?: string } {
  if (!fen || typeof fen !== "string") {
    return { valid: false, error: "FEN must be a non-empty string." };
  }

  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) {
    return { valid: false, error: `FEN must have 6 fields, got ${parts.length}.` };
  }

  const [position, activeColor, castling, enPassant, halfmove, fullmove] = parts;

  const posResult = validatePosition(position);
  if (!posResult.valid) return posResult;

  if (!VALID_ACTIVE_COLOR.has(activeColor)) {
    return { valid: false, error: `Active color must be 'w' or 'b', got '${activeColor}'.` };
  }

  if (!CASTLING_REGEX.test(castling)) {
    return { valid: false, error: `Invalid castling field: '${castling}'.` };
  }

  if (!EN_PASSANT_REGEX.test(enPassant)) {
    return { valid: false, error: `Invalid en passant field: '${enPassant}'.` };
  }

  const halfmoveNum = parseInt(halfmove, 10);
  if (isNaN(halfmoveNum) || halfmoveNum < 0) {
    return { valid: false, error: `Halfmove clock must be a non-negative integer, got '${halfmove}'.` };
  }

  const fullmoveNum = parseInt(fullmove, 10);
  if (isNaN(fullmoveNum) || fullmoveNum < 1) {
    return { valid: false, error: `Fullmove number must be a positive integer, got '${fullmove}'.` };
  }

  return { valid: true };
}

function validatePosition(position: string): { valid: boolean; error?: string } {
  const ranks = position.split("/");
  if (ranks.length !== 8) {
    return { valid: false, error: `Position must have 8 ranks, got ${ranks.length}.` };
  }

  for (let i = 0; i < ranks.length; i++) {
    let squareCount = 0;
    for (const char of ranks[i]) {
      if (VALID_PIECE_CHARS.has(char)) {
        squareCount += 1;
      } else if (char >= "1" && char <= "8") {
        squareCount += parseInt(char, 10);
      } else {
        return { valid: false, error: `Invalid character '${char}' in rank ${8 - i}.` };
      }
    }
    if (squareCount !== 8) {
      return { valid: false, error: `Rank ${8 - i} has ${squareCount} squares, expected 8.` };
    }
  }

  return { valid: true };
}

export function getActiveColor(fen: FenString): Color {
  const parts = fen.trim().split(/\s+/);
  return parts[1] as Color;
}

export function getFullmoveNumber(fen: FenString): number {
  const parts = fen.trim().split(/\s+/);
  return parseInt(parts[5], 10);
}

export function isOpening(fen: FenString): boolean {
  const parts = fen.trim().split(/\s+/);
  const fullmove = parseInt(parts[5], 10);
  if (fullmove > 12) return false;

  const position = parts[0];
  let pieceCount = 0;
  for (const char of position) {
    if (VALID_PIECE_CHARS.has(char)) pieceCount++;
  }

  return pieceCount >= 24;
}

export function isEndgame(fen: FenString): boolean {
  const position = fen.trim().split(/\s+/)[0];
  let majorMinorCount = 0;

  for (const char of position) {
    if ("rnbqRNBQ".includes(char)) majorMinorCount++;
  }

  return majorMinorCount <= 6;
}

export function countPieces(fen: FenString): Record<string, number> {
  const position = fen.trim().split(/\s+/)[0];
  const counts: Record<string, number> = {};

  for (const char of position) {
    if (VALID_PIECE_CHARS.has(char)) {
      counts[char] = (counts[char] || 0) + 1;
    }
  }

  return counts;
}

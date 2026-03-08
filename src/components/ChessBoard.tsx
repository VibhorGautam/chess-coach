"use client";

import { useState, useCallback, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { BoardArrow } from "@/lib/types";

interface ChessBoardProps {
  fen: string;
  onFenChange: (fen: string) => void;
  arrows?: BoardArrow[];
  boardWidth?: number;
  highlightSquares?: Record<string, { backgroundColor: string }>;
}

export default function ChessBoard({
  fen,
  onFenChange,
  arrows = [],
  boardWidth = 480,
  highlightSquares = {},
}: ChessBoardProps) {
  const [orientation, setOrientation] = useState<"white" | "black">("white");

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string): boolean => {
      try {
        const g = new Chess(fen);
        const promo = piece[1]?.toLowerCase();
        const move = g.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: promo === "p" ? "q" : undefined,
        });
        if (move) {
          onFenChange(g.fen());
          return true;
        }
      } catch {
        // illegal
      }
      return false;
    },
    [fen, onFenChange]
  );

  const customArrows = arrows.map((a) => [
    a.from,
    a.to,
    a.color,
  ] as [string, string, string]) as unknown as import("react-chessboard/dist/chessboard/types").Arrow[];

  const turn = game.turn() === "w" ? "White" : "Black";
  const inCheck = game.inCheck();
  const isCheckmate = game.isCheckmate();
  const isDraw = game.isDraw();
  const moveNumber = Math.ceil(game.moveNumber());

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>Move {moveNumber}</span>
        <span className={`font-semibold ${game.turn() === "w" ? "text-white" : "text-gray-300"}`}>
          {isCheckmate
            ? `Checkmate! ${turn === "White" ? "Black" : "White"} wins`
            : isDraw
            ? "Draw"
            : inCheck
            ? `${turn} to move (IN CHECK)`
            : `${turn} to move`}
        </span>
        <button
          onClick={() => setOrientation(orientation === "white" ? "black" : "white")}
          className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          Flip
        </button>
      </div>

      <Chessboard
        id="chess-coach-board"
        position={fen}
        onPieceDrop={onDrop}
        boardWidth={boardWidth}
        boardOrientation={orientation}
        customArrows={customArrows}
        customSquareStyles={highlightSquares}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        }}
        customDarkSquareStyle={{ backgroundColor: "#779952" }}
        customLightSquareStyle={{ backgroundColor: "#edeed1" }}
      />

      <div className="flex gap-2">
        <button
          onClick={() => onFenChange(new Chess().fen())}
          className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          Reset Board
        </button>
        <button
          onClick={() => {
            try {
              const g = new Chess(fen);
              g.undo();
              onFenChange(g.fen());
            } catch {
              // nothing to undo
            }
          }}
          className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          Undo
        </button>
      </div>
    </div>
  );
}

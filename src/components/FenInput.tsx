"use client";

import { useState } from "react";
import { validateFen } from "@/lib/fen-utils";

interface FenInputProps {
  fen: string;
  onFenChange: (fen: string) => void;
}

const EXAMPLE_POSITIONS = [
  {
    name: "Italian Game",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
  },
  {
    name: "Sicilian Defense",
    fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
  },
  {
    name: "Queen's Gambit",
    fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2",
  },
  {
    name: "Ruy Lopez",
    fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
  },
  {
    name: "Middlegame Tactics",
    fen: "r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5",
  },
  {
    name: "Endgame Practice",
    fen: "8/5pk1/6p1/8/3K4/8/6PP/8 w - - 0 1",
  },
];

export default function FenInput({ fen, onFenChange }: FenInputProps) {
  const [inputValue, setInputValue] = useState(fen);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const result = validateFen(inputValue.trim());
    if (result.valid) {
      onFenChange(inputValue.trim());
      setError(null);
    } else {
      setError(result.error || "Invalid FEN");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Paste FEN string..."
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700
                     text-sm text-gray-200 placeholder-gray-500
                     focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                     text-sm font-medium transition-colors"
        >
          Load
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLE_POSITIONS.map((pos) => (
          <button
            key={pos.name}
            onClick={() => {
              setInputValue(pos.fen);
              onFenChange(pos.fen);
              setError(null);
            }}
            className="px-2 py-1 text-[11px] rounded bg-gray-800 hover:bg-gray-700
                       text-gray-400 hover:text-gray-200 transition-colors border border-gray-700"
          >
            {pos.name}
          </button>
        ))}
      </div>
    </div>
  );
}

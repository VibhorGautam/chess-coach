"use client";

import type { AnalysisResult, ScoredMove } from "@/lib/types";

interface EngineLinesProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
}

function EvalBar({ cp, mate }: { cp: number; mate: number | null }) {
  let fillPercent: number;
  let label: string;

  if (mate !== null) {
    fillPercent = mate > 0 ? 95 : 5;
    label = `M${Math.abs(mate)}`;
  } else {
    fillPercent = 50 + (50 * (2 / (1 + Math.exp(-cp / 200)) - 1));
    fillPercent = Math.max(3, Math.min(97, fillPercent));
    label = cp > 0 ? `+${(cp / 100).toFixed(1)}` : (cp / 100).toFixed(1);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-4 rounded bg-gray-700 overflow-hidden relative">
        <div
          className="absolute bottom-0 left-0 w-full transition-all duration-500"
          style={{
            height: `${fillPercent}%`,
            backgroundColor: fillPercent > 50 ? "#fff" : "#555",
          }}
        />
      </div>
      <span className={`text-[11px] font-mono ${cp >= 0 ? "text-white" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

export default function EngineLines({ result, isAnalyzing }: EngineLinesProps) {
  if (isAnalyzing) {
    return (
      <div className="flex items-center gap-3 py-4 text-gray-500 text-sm">
        <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full" />
        Analyzing...
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
          Engine Lines
        </h3>
        <span className="text-[10px] text-gray-700">
          d{result.depth} | {result.elapsedMs.toFixed(0)}ms
        </span>
      </div>
      {result.moves.slice(0, 5).map((move, i) => (
        <div
          key={move.uci}
          className={`flex items-center gap-2 py-1 px-2 rounded ${
            i === 0 ? "bg-gray-800/30" : ""
          }`}
        >
          <span className="text-[10px] text-gray-700 w-3">{i + 1}</span>
          <span className={`font-mono text-xs ${i === 0 ? "text-white font-bold" : "text-gray-500"}`}>
            {move.san}
          </span>
          <EvalBar cp={move.cp} mate={move.mate} />
        </div>
      ))}
    </div>
  );
}

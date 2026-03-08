"use client";

import type { RatingBandResult } from "@/lib/types";

interface RatingComparisonProps {
  comparisons: RatingBandResult[];
  userRating: number;
}

const RATING_COLORS: Record<number, string> = {
  500: "#ef4444",
  1000: "#f97316",
  1500: "#eab308",
  2000: "#22c55e",
};

const RATING_BG: Record<number, string> = {
  500: "rgba(239, 68, 68, 0.1)",
  1000: "rgba(249, 115, 22, 0.1)",
  1500: "rgba(234, 179, 8, 0.1)",
  2000: "rgba(34, 197, 94, 0.1)",
};

export default function RatingComparison({
  comparisons,
  userRating,
}: RatingComparisonProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        How Each Rating Sees This Position
      </h3>

      <div className="grid gap-2">
        {comparisons.map((band) => {
          const isUser = Math.abs(band.rating - userRating) < 250;
          const color = RATING_COLORS[band.rating] || "#888";
          const bg = RATING_BG[band.rating] || "rgba(136, 136, 136, 0.1)";

          return (
            <div
              key={band.rating}
              className={`rounded-lg p-3 border transition-all ${
                isUser
                  ? "border-blue-500/50 ring-1 ring-blue-500/20"
                  : "border-gray-700/50"
              }`}
              style={{ backgroundColor: bg }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: color, color: band.rating === 1500 ? "#1a1a2e" : "white" }}
                  >
                    {band.rating}
                  </span>
                  <span className="text-xs text-gray-400">{band.label}</span>
                  {isUser && (
                    <span className="text-[10px] text-blue-400 font-medium">
                      (Your level)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg font-mono font-bold" style={{ color }}>
                  {band.topMove.san}
                </span>
                <span className="text-xs text-gray-500">
                  {(band.topMove.probability * 100).toFixed(0)}% likely
                </span>
                {band.topMove.cpLoss > 0 && (
                  <span className="text-[10px] text-gray-600">
                    ({band.topMove.cpLoss > 0 ? `-${band.topMove.cpLoss}cp` : "best"})
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 italic mt-1">{band.thought}</p>

              {/* Show other candidates */}
              {band.moves.length > 1 && (
                <div className="flex gap-2 mt-2">
                  {band.moves.slice(1, 3).map((m, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-500"
                    >
                      {m.san} ({(m.probability * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

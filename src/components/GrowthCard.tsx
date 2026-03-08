"use client";

import type { GrowthRecommendation } from "@/lib/types";

interface GrowthCardProps {
  recommendation: GrowthRecommendation;
  userRating: number;
}

export default function GrowthCard({ recommendation, userRating }: GrowthCardProps) {
  const {
    move,
    userTopMove,
    targetRating,
    explanation,
    whyBetter,
    concept,
    cpImprovement,
    isUserMoveOptimal,
  } = recommendation;

  if (isUserMoveOptimal) {
    return (
      <div className="rounded-xl p-5 border-2 border-green-500/50 bg-gradient-to-br from-gray-900 to-green-900/20">
        <div className="text-[10px] font-extrabold tracking-widest text-green-400 mb-2">
          GREAT INSTINCT!
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl font-mono font-bold text-green-400">
            {move.san}
          </span>
          <span className="text-sm text-green-300/70">
            You&apos;d already play the right move here
          </span>
        </div>
        <p className="text-sm text-gray-400">{explanation}</p>
        <div className="mt-3 px-3 py-2 rounded-lg bg-green-900/30 border border-green-500/20">
          <p className="text-xs text-green-300/80">{concept}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 border-2 border-pink-500/50 bg-gradient-to-br from-gray-900 to-pink-900/10">
      <div className="text-[10px] font-extrabold tracking-widest text-pink-400 mb-3">
        YOUR GROWTH MOVE
      </div>

      <div className="flex items-start gap-4 mb-4">
        {/* User's likely move */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500 mb-1">You&apos;d play</span>
          <span className="text-xl font-mono text-gray-400 line-through">
            {userTopMove.san}
          </span>
          {userTopMove.mate === null && (
            <span className="text-[10px] text-red-400/70">
              {cpImprovement > 0 && `-${cpImprovement}cp`}
            </span>
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center pt-5">
          <svg width="40" height="20" viewBox="0 0 40 20" className="text-pink-400">
            <path
              d="M0 10 L30 10 M25 4 L32 10 L25 16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        {/* Growth move */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-pink-400 mb-1">Try instead</span>
          <span className="text-3xl font-mono font-bold text-pink-300">
            {move.san}
          </span>
          <span className="text-[10px] text-green-400/70">
            +{cpImprovement}cp better
          </span>
        </div>
      </div>

      {/* Explanation */}
      <div className="space-y-2">
        <p className="text-sm text-gray-300">{explanation}</p>

        <div className="px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <p className="text-xs text-gray-400">
            <span className="text-pink-400 font-semibold">Why it&apos;s better: </span>
            {whyBetter}
          </p>
        </div>

        <div className="px-3 py-2 rounded-lg bg-pink-900/20 border border-pink-500/20">
          <p className="text-[11px] text-pink-300/80">
            <span className="font-semibold">Concept to learn: </span>
            {concept}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>Target: ~{targetRating} ELO</span>
          <span>|</span>
          <span>+{cpImprovement}cp improvement</span>
          <span>|</span>
          <span>
            Move rated for ~{userRating + 200} player
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

interface RatingSelectorProps {
  rating: number;
  onChange: (rating: number) => void;
}

const RATING_LABELS: Record<number, string> = {
  500: "Beginner",
  600: "Beginner+",
  700: "Novice",
  800: "Novice+",
  900: "Low Club",
  1000: "Club Player",
  1100: "Club+",
  1200: "Upper Club",
  1300: "Strong Club",
  1400: "Tournament",
  1500: "Intermediate",
  1600: "Intermediate+",
  1700: "Expert",
  1800: "Expert+",
  1900: "Candidate",
  2000: "Candidate Master",
};

function getRatingColor(rating: number): string {
  if (rating < 700) return "#ef4444";
  if (rating < 1000) return "#f97316";
  if (rating < 1300) return "#eab308";
  if (rating < 1600) return "#22c55e";
  return "#3b82f6";
}

export default function RatingSelector({ rating, onChange }: RatingSelectorProps) {
  const color = getRatingColor(rating);
  const label = RATING_LABELS[rating] || `~${rating}`;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Your Rating</span>
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {rating}
          </span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>
      <input
        type="range"
        min={500}
        max={2000}
        step={100}
        value={rating}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>500</span>
        <span>1000</span>
        <span>1500</span>
        <span>2000</span>
      </div>
    </div>
  );
}

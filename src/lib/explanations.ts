import type { MoveCategory, ExplanationTier } from "./types";
import { TacticalMotif, PositionalMotif, StrategicMotif } from "./types";

type ExplanationGen = (san: string, primary: MoveCategory, all: MoveCategory[]) => string;

export function generateExplanation(
  san: string,
  categories: MoveCategory[],
  tier: ExplanationTier,
): string {
  const primary = categories[0];
  if (!primary) return `${san} is a solid move.`;

  return EXPLANATION_GENERATORS[tier](san, primary, categories);
}

const EXPLANATION_GENERATORS: Record<ExplanationTier, ExplanationGen> = {
  beginner: (san, primary) => {
    switch (primary) {
      case TacticalMotif.Capture:
        return `${san} takes a piece! Winning material is always good.`;
      case TacticalMotif.Check:
        return `${san} puts the king in check. They HAVE to deal with it.`;
      case TacticalMotif.Fork:
        return `${san} attacks two things at once! They can only save one.`;
      case TacticalMotif.Sacrifice:
        return `${san} gives up material for a bigger attack. Bold!`;
      case PositionalMotif.Development:
        return `${san} gets a piece into the game. More pieces playing = stronger.`;
      case PositionalMotif.KingSafety:
        return `${san} keeps your king safe. Safe king = free to attack.`;
      case PositionalMotif.CenterControl:
        return `${san} fights for the center. The middle of the board is the most powerful spot.`;
      case PositionalMotif.PieceActivity:
        return `${san} puts a piece on a better square. Small improvements add up!`;
      default:
        return `${san} is a good move that improves your position.`;
    }
  },

  intermediate: (san, primary) => {
    switch (primary) {
      case TacticalMotif.Capture:
        return `${san} wins material. Check the resulting position, not just the piece count.`;
      case TacticalMotif.Check:
        return `${san} gives check. Use this tempo to improve your position.`;
      case TacticalMotif.Fork:
        return `${san} creates a double attack. The opponent can't defend everything.`;
      case TacticalMotif.Pin:
        return `${san} pins a piece. It's stuck defending something more valuable.`;
      case PositionalMotif.Development:
        return `${san} develops with purpose. The piece reaches its ideal square.`;
      case PositionalMotif.CenterControl:
        return `${san} fights for central control. Central dominance gives all your pieces more scope.`;
      case PositionalMotif.PieceActivity:
        return `${san} improves your worst piece. When all pieces are active, tactics appear naturally.`;
      case StrategicMotif.PawnStructure:
        return `${san} improves the pawn structure. Good structure supports better piece play.`;
      case StrategicMotif.Prophylaxis:
        return `${san} prevents your opponent's plan before it starts. Think defense first.`;
      default:
        return `${san} strengthens your position. Not flashy, but effective.`;
    }
  },

  advanced: (san, primary) => {
    switch (primary) {
      case TacticalMotif.Capture:
        return `${san} is the critical tactical continuation. The resulting position is objectively winning.`;
      case TacticalMotif.Sacrifice:
        return `${san} sacrifices material for lasting initiative. The compensation is concrete.`;
      case PositionalMotif.PieceActivity:
        return `${san} optimizes piece coordination. The improvement is subtle but significant.`;
      case StrategicMotif.Prophylaxis:
        return `${san} is prophylactic. It neutralizes the opponent's plan while maintaining flexibility.`;
      case StrategicMotif.PawnStructure:
        return `${san} reshapes the pawn structure to favor the long-term endgame.`;
      case StrategicMotif.SpaceAdvantage:
        return `${san} gains space, restricting the opponent's piece mobility.`;
      default:
        return `${san} is the most precise continuation in this structure.`;
    }
  },
};

export function generateWhyBetter(
  userSan: string,
  growthSan: string,
  cpDiff: number,
  tier: ExplanationTier,
): string {
  if (tier === "beginner") {
    if (cpDiff > 150) {
      return `Instead of ${userSan}, try ${growthSan}. It's much safer and keeps your pieces protected.`;
    }
    return `${growthSan} is a bit better than ${userSan}. It gives you more options on your next turn.`;
  }

  if (tier === "intermediate") {
    if (cpDiff > 100) {
      return `${userSan} looks natural, but ${growthSan} is stronger. It doesn't give your opponent counterplay.`;
    }
    return `${growthSan} is more accurate than ${userSan}. The difference: it also addresses your opponent's plans.`;
  }

  if (cpDiff > 50) {
    return `While ${userSan} is reasonable, ${growthSan} is more precise. It maintains the initiative with optimal piece coordination.`;
  }
  return `${growthSan} over ${userSan}: a small but meaningful improvement in positional accuracy.`;
}

export function deriveConcept(
  categories: MoveCategory[],
  tier: ExplanationTier,
): string {
  const primary = categories[0];

  const concepts: Partial<Record<MoveCategory, Record<ExplanationTier, string>>> = {
    [TacticalMotif.Capture]: {
      beginner: "Look before you grab. Not all captures are equal!",
      intermediate: "Calculate exchanges fully before committing.",
      advanced: "Material evaluation depends on the resulting position.",
    },
    [TacticalMotif.Check]: {
      beginner: "Checks are flashy, but they're not always best.",
      intermediate: "Use checks to gain tempo, not just to check.",
      advanced: "A check must serve a concrete purpose in the variation.",
    },
    [PositionalMotif.Development]: {
      beginner: "Get your pieces out before attacking!",
      intermediate: "Develop with a plan. Each piece needs a job.",
      advanced: "Harmonize piece placement with the pawn structure.",
    },
    [PositionalMotif.PieceActivity]: {
      beginner: "Put your pieces where they can do the most.",
      intermediate: "Improve your worst piece before starting an attack.",
      advanced: "The strongest moves are often the quietest.",
    },
    [PositionalMotif.CenterControl]: {
      beginner: "Control the center to control the game.",
      intermediate: "Central pawns restrict your opponent's options.",
      advanced: "Central dominance enables operations on either flank.",
    },
    [StrategicMotif.Prophylaxis]: {
      beginner: "Think about what your opponent wants to do.",
      intermediate: "Stop their plan before it starts.",
      advanced: "Prophylaxis often yields subtle but lasting advantages.",
    },
  };

  if (primary && concepts[primary]?.[tier]) {
    return concepts[primary]![tier]!;
  }

  const fallbacks: Record<ExplanationTier, string> = {
    beginner: "Every move should make your position a little better.",
    intermediate: "Small, purposeful improvements compound into winning advantages.",
    advanced: "Precision in quiet positions separates good from great.",
  };

  return fallbacks[tier];
}

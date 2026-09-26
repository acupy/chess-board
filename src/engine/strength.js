/**
 * Map a target Elo to Stockfish UCI options and extra weakening.
 *
 * Stockfish's native floor is UCI_Elo 1320 ≈ Skill Level 0 (CCRL blitz).
 * Skill Level 10 is much stronger (~2300), so beginners must NOT be
 * mapped onto higher skill numbers. Below 1320 we keep Skill 0 and mix
 * in weaker legal moves so the opponent can actually play below that floor.
 */

export const MIN_UCI_ELO = 1320;
export const MAX_UCI_ELO = 3190;
export const MIN_TARGET_ELO = 100;

/**
 * @param {number} elo
 * @returns {{
 *   limitStrength: boolean,
 *   uciElo: number | null,
 *   skillLevel: number,
 *   mistakeRate: number,
 * }}
 */
export const strengthOptionsForElo = (elo) => {
  const clamped = Math.max(
    MIN_TARGET_ELO,
    Math.min(MAX_UCI_ELO, Math.round(Number(elo) || MIN_TARGET_ELO))
  );

  if (clamped >= MIN_UCI_ELO) {
    return {
      limitStrength: true,
      uciElo: Math.min(MAX_UCI_ELO, clamped),
      skillLevel: 20,
      mistakeRate: 0,
    };
  }

  // 0 at the 1320 floor, 1 at Elo 100.
  const mistakeRate = (MIN_UCI_ELO - clamped) / (MIN_UCI_ELO - MIN_TARGET_ELO);
  return {
    limitStrength: false,
    uciElo: null,
    skillLevel: 0,
    mistakeRate,
  };
};

/**
 * Below Stockfish's floor, replace the engine move with a different legal
 * move with probability `mistakeRate`.
 *
 * @param {string[]} legalMoves
 * @param {string | null} engineMove
 * @param {number} mistakeRate
 * @param {() => number} [rng]
 * @returns {string | null}
 */
export const chooseLimitedMove = (legalMoves, engineMove, mistakeRate, rng = Math.random) => {
  if (!Array.isArray(legalMoves) || legalMoves.length === 0) {
    return engineMove || null;
  }

  const safeEngine = legalMoves.includes(engineMove) ? engineMove : legalMoves[0];
  if (!(mistakeRate > 0) || rng() >= mistakeRate) {
    return safeEngine;
  }

  const others = legalMoves.filter((move) => move !== safeEngine);
  if (others.length === 0) return safeEngine;
  return others[Math.floor(rng() * others.length)];
};

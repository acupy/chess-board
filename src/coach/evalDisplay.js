/**
 * Map White-perspective centipawns to a 0–1 “White share” of the doughnut.
 * Soft sigmoid so ±4 pawns isn’t already a full wipe.
 */
export const whiteShareFromCp = (cp) => {
  if (!Number.isFinite(cp)) return 0.5;
  return 1 / (1 + Math.exp(-cp / 400));
};

/**
 * Normalize Stockfish score (side-to-move) to White’s perspective.
 * @param {{ type?: string, value?: number, cp?: number }|null} score
 * @param {boolean} whiteToMove
 * @returns {{ cp: number, mate: number|null }}
 */
export const toWhiteEval = (score, whiteToMove) => {
  if (!score) return { cp: 0, mate: null };

  if (score.type === 'mate') {
    // UCI "mate 0" = already checkmated (game over). No move count — just #+ / #−.
    if (score.value === 0) {
      return whiteToMove
        ? { cp: -100000, mate: null }
        : { cp: 100000, mate: null };
    }
    const mate = whiteToMove ? score.value : -score.value;
    return {
      cp: mate > 0 ? 100000 - Math.abs(mate) * 100 : -100000 + Math.abs(mate) * 100,
      mate,
    };
  }

  let cp = whiteToMove ? (score.cp ?? 0) : -(score.cp ?? 0);

  // Some engines report a terminal mate as a huge cp instead of mate N
  if (Math.abs(cp) >= 90000) {
    return { cp, mate: null };
  }

  return { cp, mate: null };
};

/** Compact label for the doughnut center: +0.8, 0.0, −1.2, #+3, #−2, #+ (mated) */
export const formatEvalLabel = ({ cp = 0, mate = null } = {}) => {
  // mate N = mate in N moves; already-mated positions use mate null + huge cp → #+ / #−
  if (mate != null && mate !== 0) {
    return mate > 0 ? `#+${Math.abs(mate)}` : `#−${Math.abs(mate)}`;
  }
  if (Math.abs(cp) >= 90000) {
    return cp > 0 ? '#+' : '#−';
  }
  const pawns = (Number(cp) || 0) / 100;
  if (Math.abs(pawns) < 0.05) return '0.0';
  const rounded = Math.round(pawns * 10) / 10;
  // Never show absurd pawn figures from mate encoding
  if (Math.abs(rounded) >= 500) {
    return rounded > 0 ? '#+' : '#−';
  }
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
};

export const evalWhoIsAhead = ({ cp = 0, mate = null } = {}) => {
  if (mate != null && mate !== 0) {
    return mate > 0 ? 'white' : 'black';
  }
  if (Math.abs(cp) >= 90000) {
    return cp > 0 ? 'white' : 'black';
  }
  if (Math.abs(cp) < 30) return 'equal';
  return cp > 0 ? 'white' : 'black';
};

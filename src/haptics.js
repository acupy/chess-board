/**
 * Light device haptics via the Vibration API (Android Chrome, etc.).
 * No-ops where unsupported (notably iOS Safari).
 */

export const vibrateMove = () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(14);
    }
  } catch {
    /* ignore */
  }
};

/** Soft tap when picking up / selecting a piece. */
export const vibrateSelect = () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  } catch {
    /* ignore */
  }
};

export const vibrateCapture = () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([18, 35, 32]);
    }
  } catch {
    /* ignore */
  }
};

export const vibrateForMove = (isCapture) => {
  if (isCapture) vibrateCapture();
  else vibrateMove();
};

/** Rough piece count from a FEN placement field (ignores empty squares). */
export const fenPieceCount = (fen) => {
  if (!fen) return 0;
  const placement = String(fen).split(/\s+/)[0] || '';
  return (placement.match(/[prnbqkPRNBQK]/g) || []).length;
};

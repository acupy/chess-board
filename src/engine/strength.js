/**
 * Map a target Elo to how the opponent should choose moves.
 *
 * At 1320+ Stockfish can aim with UCI_Elo. Below that floor we search at
 * full strength (accurate evals) and pick among candidates like a human
 * of that rating — by eval loss and what they would notice — not by
 * randomly replacing legal moves.
 */

export const MIN_UCI_ELO = 1320;
export const MAX_UCI_ELO = 3190;
export const MIN_TARGET_ELO = 100;
export const HUMAN_ELO_FLOOR = 400;
export const HUMAN_ELO_CEILING = 1300;
export const HUMAN_MULTIPV = 16;

export const QUALITY_KEYS = ['best', 'veryGood', 'reasonable', 'inaccurate', 'bad', 'blunder'];

/** Eval-loss buckets in centipawns vs the best move. */
export const qualityForLossCp = (lossCp) => {
  const loss = Number.isFinite(lossCp) ? lossCp : 9999;
  if (loss <= 20) return 'best';
  if (loss <= 60) return 'veryGood';
  if (loss <= 140) return 'reasonable';
  if (loss <= 280) return 'inaccurate';
  if (loss <= 550) return 'bad';
  return 'blunder';
};

/**
 * Human-error mix at rating anchors. A 400 player mostly plays
 * reasonable-to-inaccurate moves, not uniform random legal moves.
 */
export const QUALITY_ANCHORS = [
  {
    elo: 400,
    weights: { best: 0.05, veryGood: 0.1, reasonable: 0.25, inaccurate: 0.3, bad: 0.2, blunder: 0.1 },
  },
  {
    elo: 700,
    weights: { best: 0.15, veryGood: 0.22, reasonable: 0.3, inaccurate: 0.2, bad: 0.09, blunder: 0.04 },
  },
  {
    elo: 1000,
    weights: { best: 0.32, veryGood: 0.28, reasonable: 0.22, inaccurate: 0.12, bad: 0.05, blunder: 0.01 },
  },
  {
    elo: 1300,
    weights: { best: 0.55, veryGood: 0.25, reasonable: 0.12, inaccurate: 0.06, bad: 0.015, blunder: 0.005 },
  },
];

const clampElo = (elo) =>
  Math.max(MIN_TARGET_ELO, Math.min(MAX_UCI_ELO, Math.round(Number(elo) || MIN_TARGET_ELO)));

const lerp = (a, b, t) => a + (b - a) * t;

export const qualityWeightsForElo = (elo) => {
  const e = Math.max(HUMAN_ELO_FLOOR, Math.min(HUMAN_ELO_CEILING, clampElo(elo)));
  let lo = QUALITY_ANCHORS[0];
  let hi = QUALITY_ANCHORS[QUALITY_ANCHORS.length - 1];
  for (let i = 0; i < QUALITY_ANCHORS.length - 1; i++) {
    if (e >= QUALITY_ANCHORS[i].elo && e <= QUALITY_ANCHORS[i + 1].elo) {
      lo = QUALITY_ANCHORS[i];
      hi = QUALITY_ANCHORS[i + 1];
      break;
    }
  }
  if (e <= lo.elo) return { ...lo.weights };
  if (e >= hi.elo) return { ...hi.weights };
  const t = (e - lo.elo) / (hi.elo - lo.elo);
  const weights = {};
  for (const key of QUALITY_KEYS) {
    weights[key] = lerp(lo.weights[key], hi.weights[key], t);
  }
  return weights;
};

/** Chance a player of this rating notices a given kind of thing. */
export const noticeRatesForElo = (elo) => {
  const t = Math.max(0, Math.min(1, (clampElo(elo) - HUMAN_ELO_FLOOR) / (HUMAN_ELO_CEILING - HUMAN_ELO_FLOOR)));
  return {
    hangingOpponent: lerp(0.32, 0.95, t),
    ownHanging: lerp(0.42, 0.97, t),
    checks: lerp(0.72, 0.98, t),
    captures: lerp(0.7, 0.96, t),
    development: lerp(0.4, 0.9, t),
    castle: lerp(0.18, 0.88, t),
  };
};

/**
 * @param {number} elo
 * @returns {{
 *   mode: 'uciElo' | 'human',
 *   limitStrength: boolean,
 *   uciElo: number | null,
 *   skillLevel: number,
 *   multiPv: number,
 * }}
 */
export const strengthOptionsForElo = (elo) => {
  const clamped = clampElo(elo);
  if (clamped >= MIN_UCI_ELO) {
    return {
      mode: 'uciElo',
      limitStrength: true,
      uciElo: Math.min(MAX_UCI_ELO, clamped),
      skillLevel: 20,
      multiPv: 1,
    };
  }
  return {
    mode: 'human',
    limitStrength: false,
    uciElo: null,
    skillLevel: 20,
    multiPv: HUMAN_MULTIPV,
  };
};

import { EMPTY } from '../consts';

/** How long a capture fight plays before the piece leaves the board. */
export const FANTASY_STRIKE_MS = 820;

/**
 * Haven vs Inferno — original names on the classic good/evil creature lineup
 * (pikeman, dragon, archangel, imp, archdevil, and the rest).
 */
export const FANTASY_ROSTER = {
  P: { name: 'Rowan', creature: 'Pikeman', plate: 'Pikeman', faction: 'Haven', idle: 'bob', size: 'pawn' },
  N: { name: 'Argent', creature: 'White Dragon', plate: 'Dragon', faction: 'Haven', idle: 'fly', size: 'minor' },
  B: { name: 'Aldous', creature: 'Zealot', plate: 'Zealot', faction: 'Haven', idle: 'sway', size: 'minor' },
  R: { name: 'Dawnspire', creature: 'Angel Castle', plate: 'Castle', faction: 'Haven', idle: 'breathe', size: 'major' },
  Q: { name: 'Seraphine', creature: 'Archangel', plate: 'Seraphine', faction: 'Haven', idle: 'fly', size: 'royal' },
  K: { name: 'Roland', creature: 'Lord of Haven', plate: 'Roland', faction: 'Haven', idle: 'regal', size: 'royal' },
  p: { name: 'Soot', creature: 'Imp', plate: 'Imp', faction: 'Inferno', idle: 'fly', size: 'pawn' },
  n: { name: 'Noctis', creature: 'Black Dragon', plate: 'Dragon', faction: 'Inferno', idle: 'prowl', size: 'minor' },
  b: { name: 'Mordec', creature: 'Black Priest', plate: 'Priest', faction: 'Inferno', idle: 'flicker', size: 'minor' },
  r: { name: 'Cinderkeep', creature: 'Inferno Castle', plate: 'Castle', faction: 'Inferno', idle: 'breathe', size: 'major' },
  q: { name: 'Ashara', creature: 'Archdevil', plate: 'Ashara', faction: 'Inferno', idle: 'fly', size: 'royal' },
  k: { name: 'Vex', creature: 'Infernal Overlord', plate: 'Vex', faction: 'Inferno', idle: 'regal', size: 'royal' },
};

export const fantasyLabel = (piece) => {
  const meta = FANTASY_ROSTER[piece];
  if (!meta) return '';
  return `${meta.name} — ${meta.creature}`;
};

export const fantasyMotionEnabled = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const isWhite = (piece) => piece === piece.toUpperCase();

/**
 * If `nextBoard` is a single capture (including en passant and promotion
 * captures), return who struck whom. Quiet moves and castling return null.
 */
export const diffCapture = (prevBoard, nextBoard) => {
  let prevCount = 0;
  let nextCount = 0;
  const vacated = [];
  const filled = [];

  for (let rank = 0; rank < 8; rank += 1) {
    for (let column = 0; column < 8; column += 1) {
      const prev = prevBoard[rank][column];
      const next = nextBoard[rank][column];
      if (prev !== EMPTY) prevCount += 1;
      if (next !== EMPTY) nextCount += 1;
      if (prev === next) continue;
      if (prev !== EMPTY && next === EMPTY) {
        vacated.push({ rank, column, piece: prev });
      } else if (next !== EMPTY) {
        filled.push({ rank, column, piece: next, prev });
      }
    }
  }

  if (nextCount >= prevCount || filled.length !== 1) return null;

  const to = filled[0];
  const attackerWhite = isWhite(to.piece);
  const origin = vacated.find((square) => {
    if (isWhite(square.piece) !== attackerWhite) return false;
    const fromType = square.piece.toUpperCase();
    const toType = to.piece.toUpperCase();
    return fromType === toType || (fromType === 'P' && 'NBRQ'.includes(toType));
  });
  if (!origin) return null;

  if (to.prev !== EMPTY) {
    return {
      attacker: to.piece,
      defender: to.prev,
      from: [origin.rank, origin.column],
      to: [to.rank, to.column],
      victimAt: [to.rank, to.column],
    };
  }

  const victim = vacated.find(
    (square) => square !== origin && isWhite(square.piece) !== attackerWhite
  );
  if (!victim) return null;

  return {
    attacker: to.piece,
    defender: victim.piece,
    from: [origin.rank, origin.column],
    to: [to.rank, to.column],
    victimAt: [victim.rank, victim.column],
  };
};

const sign = (value) => {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
};

/** CSS variables that drive the lunge and the knockback. */
export const battleMotion = (capture) => {
  const dx = capture.to[1] - capture.from[1];
  const dy = capture.to[0] - capture.from[0];
  const vx = capture.victimAt[1] - capture.from[1];
  const vy = capture.victimAt[0] - capture.from[0];
  const spin = dx >= 0 ? 16 : -16;
  return {
    lunge: { '--dx': dx, '--dy': dy, '--spin': spin },
    struck: {
      '--kx': sign(vx) || sign(dx) || 1,
      '--ky': sign(vy) || sign(dy) || 0,
      '--spin': spin > 0 ? 22 : -22,
    },
  };
};

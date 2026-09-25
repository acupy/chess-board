import { EMPTY } from '../consts';
import { coordsToSquare, findKing, inBounds, isWhitePiece } from './board';

const PIECE_NAMES = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const RAYS = {
  rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
};

/**
 * List every piece of the given side that attacks (rank, column).
 * @returns {{ rank: number, column: number, piece: string }[]}
 */
export const listAttackers = (board, rank, column, byWhite) => {
  const attackers = [];

  const originRank = byWhite ? rank + 1 : rank - 1;
  for (const originColumn of [column - 1, column + 1]) {
    if (!inBounds(originRank, originColumn)) continue;
    const piece = board[originRank][originColumn];
    if (piece === (byWhite ? 'P' : 'p')) {
      attackers.push({ rank: originRank, column: originColumn, piece });
    }
  }

  for (const [dr, dc] of KNIGHT_DELTAS) {
    const r = rank + dr;
    const c = column + dc;
    if (!inBounds(r, c)) continue;
    const piece = board[r][c];
    if (piece === (byWhite ? 'N' : 'n')) {
      attackers.push({ rank: r, column: c, piece });
    }
  }

  for (const [dr, dc] of KING_DELTAS) {
    const r = rank + dr;
    const c = column + dc;
    if (!inBounds(r, c)) continue;
    const piece = board[r][c];
    if (piece === (byWhite ? 'K' : 'k')) {
      attackers.push({ rank: r, column: c, piece });
    }
  }

  const pushRay = (dirs, pieces) => {
    for (const [dr, dc] of dirs) {
      let r = rank + dr;
      let c = column + dc;
      while (inBounds(r, c)) {
        const piece = board[r][c];
        if (piece !== EMPTY) {
          if (pieces.includes(piece)) {
            attackers.push({ rank: r, column: c, piece });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  };

  pushRay(RAYS.rook, byWhite ? ['R', 'Q'] : ['r', 'q']);
  pushRay(RAYS.bishop, byWhite ? ['B', 'Q'] : ['b', 'q']);

  return attackers;
};

const pieceLabel = (piece, square) => {
  const name = PIECE_NAMES[piece.toLowerCase()] || 'piece';
  return `your ${name} on ${square}`;
};

/**
 * Absolute pins for `forWhite`: friendly piece stuck between own king and an enemy slider.
 * @returns {{ key: string, kind: 'pin', square: string, coords: [number, number], piece: string, label: string }[]}
 */
export const findAbsolutePins = (board, forWhite = true) => {
  const king = findKing(board, forWhite);
  if (!king) return [];

  const pins = [];
  const enemySliders = forWhite
    ? { rook: ['r', 'q'], bishop: ['b', 'q'] }
    : { rook: ['R', 'Q'], bishop: ['B', 'Q'] };

  const scan = (dirs, sliders) => {
    for (const [dr, dc] of dirs) {
      let r = king[0] + dr;
      let c = king[1] + dc;
      let pinned = null;

      while (inBounds(r, c)) {
        const piece = board[r][c];
        if (piece === EMPTY) {
          r += dr;
          c += dc;
          continue;
        }

        const white = isWhitePiece(piece);
        if (!pinned) {
          if (white === forWhite && piece.toLowerCase() !== 'k') {
            pinned = { rank: r, column: c, piece };
            r += dr;
            c += dc;
            continue;
          }
          break;
        }

        if (white !== forWhite && sliders.includes(piece)) {
          const square = coordsToSquare([pinned.rank, pinned.column]);
          pins.push({
            key: `pin:${square}`,
            kind: 'pin',
            square,
            coords: [pinned.rank, pinned.column],
            piece: pinned.piece,
            label: pieceLabel(pinned.piece, square),
          });
        }
        break;
      }
    }
  };

  scan(RAYS.rook, enemySliders.rook);
  scan(RAYS.bishop, enemySliders.bishop);
  return pins;
};

/**
 * Hanging pieces for `forWhite`: attacked by the opponent and not defended.
 * Kings are skipped (check UI covers that).
 * @returns {{ key: string, kind: 'hanging', square: string, coords: [number, number], piece: string, label: string }[]}
 */
export const findHangingPieces = (board, forWhite = true) => {
  const hangings = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let column = 0; column < 8; column++) {
      const piece = board[rank][column];
      if (piece === EMPTY) continue;
      if (isWhitePiece(piece) !== forWhite) continue;
      if (piece.toLowerCase() === 'k') continue;

      const attackers = listAttackers(board, rank, column, !forWhite);
      if (attackers.length === 0) continue;

      const defenders = listAttackers(board, rank, column, forWhite);
      if (defenders.length > 0) continue;

      const square = coordsToSquare([rank, column]);
      hangings.push({
        key: `hanging:${square}`,
        kind: 'hanging',
        square,
        coords: [rank, column],
        piece,
        label: pieceLabel(piece, square),
      });
    }
  }

  return hangings;
};

/**
 * Learner-facing dangers on the player's pieces (default: white).
 */
export const findPlayerDangers = (game, forWhite = true) => {
  const hangings = findHangingPieces(game.board, forWhite);
  const pins = findAbsolutePins(game.board, forWhite);
  return {
    hangings,
    pins,
    all: [...hangings, ...pins],
  };
};

/**
 * Drop resolved keys, return dangers that have not been announced yet, and mark them announced.
 * @param {Set<string>} announcedKeys
 * @param {{ key: string }[]} active
 */
export const takeNewDangers = (announcedKeys, active) => {
  const activeKeys = new Set(active.map((d) => d.key));
  for (const key of [...announcedKeys]) {
    if (!activeKeys.has(key)) announcedKeys.delete(key);
  }

  const fresh = active.filter((d) => !announcedKeys.has(d.key));
  for (const danger of fresh) {
    announcedKeys.add(danger.key);
  }
  return fresh;
};

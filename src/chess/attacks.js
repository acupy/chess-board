import { EMPTY } from '../consts';
import { findKing, inBounds, isWhitePiece } from './board';

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

const pawnAttacksSquare = (board, rank, column, byWhite) => {
  const originRank = byWhite ? rank + 1 : rank - 1;
  for (const originColumn of [column - 1, column + 1]) {
    if (inBounds(originRank, originColumn) && board[originRank][originColumn] === (byWhite ? 'P' : 'p')) {
      return true;
    }
  }
  return false;
};

const leapsToSquare = (board, rank, column, deltas, piece) =>
  deltas.some(([dr, dc]) => {
    const r = rank + dr;
    const c = column + dc;
    return inBounds(r, c) && board[r][c] === piece;
  });

const rayAttacksSquare = (board, rank, column, deltas, pieces) => {
  for (const [dr, dc] of deltas) {
    let r = rank + dr;
    let c = column + dc;
    while (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece !== EMPTY) {
        if (pieces.includes(piece)) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return false;
};

export const isSquareAttacked = (board, rank, column, byWhite) => {
  if (pawnAttacksSquare(board, rank, column, byWhite)) return true;
  if (leapsToSquare(board, rank, column, KNIGHT_DELTAS, byWhite ? 'N' : 'n')) return true;
  if (leapsToSquare(board, rank, column, KING_DELTAS, byWhite ? 'K' : 'k')) return true;
  if (rayAttacksSquare(board, rank, column, RAYS.rook, byWhite ? ['R', 'Q'] : ['r', 'q'])) return true;
  if (rayAttacksSquare(board, rank, column, RAYS.bishop, byWhite ? ['B', 'Q'] : ['b', 'q'])) return true;
  return false;
};

export const isInCheck = (board, white) => {
  const king = findKing(board, white);
  if (!king) return false;
  return isSquareAttacked(board, king[0], king[1], !white);
};

export const isWhiteToMove = (game) => game.turn === 'w';

export const pieceBelongsToSideToMove = (game, piece) => {
  if (piece === EMPTY) return false;
  return isWhiteToMove(game) === isWhitePiece(piece);
};

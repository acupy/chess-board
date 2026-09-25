import { EMPTY, FIELD_AVAILABILITY } from '../consts';
import { isInCheck, isSquareAttacked, isWhiteToMove, pieceBelongsToSideToMove } from './attacks';
import {
  cloneBoard,
  createEmptyAvailabilityMatrix,
  inBounds,
  isOpponentPiece,
  isWhitePiece,
} from './board';
import { cloneGame } from './fen';

const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const fieldAvailability = (board, from, toRank, toColumn) => {
  const target = board[toRank][toColumn];
  if (target === EMPTY) return FIELD_AVAILABILITY.AVAILABLE;
  if (isOpponentPiece(board[from[0]][from[1]], target)) return FIELD_AVAILABILITY.HIT;
  return FIELD_AVAILABILITY.DEFEND;
};

const applyRayMoves = (board, from, dirs, matrix) => {
  for (const [dr, dc] of dirs) {
    let rank = from[0] + dr;
    let column = from[1] + dc;
    while (inBounds(rank, column)) {
      const availability = fieldAvailability(board, from, rank, column);
      matrix[rank][column] = availability;
      if (availability !== FIELD_AVAILABILITY.AVAILABLE) break;
      rank += dr;
      column += dc;
    }
  }
};

const applyLeapMoves = (board, from, deltas, matrix) => {
  for (const [dr, dc] of deltas) {
    const rank = from[0] + dr;
    const column = from[1] + dc;
    if (inBounds(rank, column)) {
      matrix[rank][column] = fieldAvailability(board, from, rank, column);
    }
  }
};

const applyPawnMoves = (game, from, matrix) => {
  const { board, enPassant } = game;
  const [rank, column] = from;
  const white = isWhitePiece(board[rank][column]);
  const dir = white ? -1 : 1;
  const startRank = white ? 6 : 1;
  const lastRank = white ? 0 : 7;

  const oneAhead = rank + dir;
  if (inBounds(oneAhead, column) && board[oneAhead][column] === EMPTY) {
    matrix[oneAhead][column] = FIELD_AVAILABILITY.AVAILABLE;
    const twoAhead = rank + dir * 2;
    if (rank === startRank && board[twoAhead][column] === EMPTY) {
      matrix[twoAhead][column] = FIELD_AVAILABILITY.AVAILABLE;
    }
  }

  for (const side of [-1, 1]) {
    const captureColumn = column + side;
    const captureRank = rank + dir;
    if (!inBounds(captureRank, captureColumn)) continue;

    if (board[captureRank][captureColumn] !== EMPTY) {
      matrix[captureRank][captureColumn] = fieldAvailability(board, from, captureRank, captureColumn);
    } else if (
      enPassant &&
      enPassant[0] === captureRank &&
      enPassant[1] === captureColumn &&
      rank !== lastRank
    ) {
      matrix[captureRank][captureColumn] = FIELD_AVAILABILITY.HIT;
    }
  }
};

const pathIsEmpty = (board, rank, columns) =>
  columns.every((column) => board[rank][column] === EMPTY);

const applyCastlingMoves = (game, from, matrix) => {
  const { board, castling } = game;
  const [rank, column] = from;
  const piece = board[rank][column];
  if (piece.toUpperCase() !== 'K' || column !== 4) return;

  const white = isWhitePiece(piece);
  const homeRank = white ? 7 : 0;
  if (rank !== homeRank) return;

  const rights = white
    ? { king: castling.K, queen: castling.Q }
    : { king: castling.k, queen: castling.q };

  if (rights.king && pathIsEmpty(board, rank, [5, 6]) && board[rank][7] === (white ? 'R' : 'r')) {
    matrix[rank][6] = FIELD_AVAILABILITY.AVAILABLE;
  }
  if (rights.queen && pathIsEmpty(board, rank, [1, 2, 3]) && board[rank][0] === (white ? 'R' : 'r')) {
    matrix[rank][2] = FIELD_AVAILABILITY.AVAILABLE;
  }
};

export const getPseudoLegalMoveMatrix = (game, from) => {
  const matrix = createEmptyAvailabilityMatrix();
  const piece = game.board[from[0]][from[1]];
  if (!piece || piece === EMPTY) return matrix;

  switch (piece.toUpperCase()) {
    case 'R':
      applyRayMoves(game.board, from, ROOK_DIRS, matrix);
      break;
    case 'B':
      applyRayMoves(game.board, from, BISHOP_DIRS, matrix);
      break;
    case 'Q':
      applyRayMoves(game.board, from, ROOK_DIRS, matrix);
      applyRayMoves(game.board, from, BISHOP_DIRS, matrix);
      break;
    case 'N':
      applyLeapMoves(game.board, from, KNIGHT_DELTAS, matrix);
      break;
    case 'P':
      applyPawnMoves(game, from, matrix);
      break;
    case 'K':
      applyLeapMoves(game.board, from, KING_DELTAS, matrix);
      applyCastlingMoves(game, from, matrix);
      break;
    default:
      break;
  }

  return matrix;
};

const updateCastlingRights = (castling, from, to, movingPiece) => {
  const next = { ...castling };
  const squares = [from, to];

  if (movingPiece === 'K') {
    next.K = false;
    next.Q = false;
  }
  if (movingPiece === 'k') {
    next.k = false;
    next.q = false;
  }

  for (const [rank, column] of squares) {
    if (rank === 7 && column === 7) next.K = false;
    if (rank === 7 && column === 0) next.Q = false;
    if (rank === 0 && column === 7) next.k = false;
    if (rank === 0 && column === 0) next.q = false;
  }

  return next;
};

export const applyMove = (game, from, to) => {
  const next = cloneGame(game);
  const [fromRank, fromColumn] = from;
  const [toRank, toColumn] = to;
  const originalPiece = next.board[fromRank][fromColumn];
  let piece = originalPiece;
  const captured = next.board[toRank][toColumn];
  const white = isWhitePiece(piece);

  const isEnPassant =
    piece.toUpperCase() === 'P' &&
    next.enPassant &&
    toRank === next.enPassant[0] &&
    toColumn === next.enPassant[1] &&
    captured === EMPTY;

  const isCastle = piece.toUpperCase() === 'K' && Math.abs(toColumn - fromColumn) === 2;

  next.board[toRank][toColumn] = piece;
  next.board[fromRank][fromColumn] = EMPTY;

  if (isEnPassant) {
    next.board[fromRank][toColumn] = EMPTY;
  }

  if (isCastle) {
    if (toColumn === 6) {
      next.board[toRank][5] = next.board[toRank][7];
      next.board[toRank][7] = EMPTY;
    } else if (toColumn === 2) {
      next.board[toRank][3] = next.board[toRank][0];
      next.board[toRank][0] = EMPTY;
    }
  }

  if (piece === 'P' && toRank === 0) piece = 'Q';
  if (piece === 'p' && toRank === 7) piece = 'q';
  next.board[toRank][toColumn] = piece;

  next.castling = updateCastlingRights(next.castling, from, to, originalPiece);
  next.enPassant =
    originalPiece.toUpperCase() === 'P' && Math.abs(toRank - fromRank) === 2
      ? [(fromRank + toRank) / 2, fromColumn]
      : null;

  const wasCapture = captured !== EMPTY || isEnPassant;
  next.halfmove = originalPiece.toUpperCase() === 'P' || wasCapture ? 0 : next.halfmove + 1;
  if (!white) next.fullmove += 1;
  next.turn = white ? 'b' : 'w';

  return next;
};

const isCastleLegal = (game, from, to) => {
  const piece = game.board[from[0]][from[1]];
  if (piece.toUpperCase() !== 'K' || Math.abs(to[1] - from[1]) !== 2) return true;

  const white = isWhitePiece(piece);
  if (isInCheck(game.board, white)) return false;

  const midColumn = (from[1] + to[1]) / 2;
  return !isSquareAttacked(game.board, from[0], midColumn, !white);
};

export const isLegalDestination = (game, from, to) => {
  const piece = game.board[from[0]][from[1]];
  if (!piece || piece === EMPTY) return false;
  if (!isCastleLegal(game, from, to)) return false;

  const next = applyMove(game, from, to);
  return !isInCheck(next.board, isWhitePiece(piece));
};

export const getLegalMoveMatrix = (game, from) => {
  const matrix = getPseudoLegalMoveMatrix(game, from);

  for (let rank = 0; rank < 8; rank++) {
    for (let column = 0; column < 8; column++) {
      const availability = matrix[rank][column];
      if (
        availability !== FIELD_AVAILABILITY.AVAILABLE &&
        availability !== FIELD_AVAILABILITY.HIT
      ) {
        continue;
      }
      if (!isLegalDestination(game, from, [rank, column])) {
        matrix[rank][column] = FIELD_AVAILABILITY.UNAVAILABLE;
      }
    }
  }

  return matrix;
};

export const tryMove = (game, from, to, enforceRules = true) => {
  if (!inBounds(to[0], to[1]) || (from[0] === to[0] && from[1] === to[1])) return null;

  if (!enforceRules) {
    const next = cloneGame(game);
    next.board = cloneBoard(game.board);
    next.board[to[0]][to[1]] = next.board[from[0]][from[1]];
    next.board[from[0]][from[1]] = EMPTY;
    return next;
  }

  const matrix = getLegalMoveMatrix(game, from);
  const availability = matrix[to[0]][to[1]];
  if (
    availability !== FIELD_AVAILABILITY.AVAILABLE &&
    availability !== FIELD_AVAILABILITY.HIT
  ) {
    return null;
  }

  return applyMove(game, from, to);
};

export const clearSquare = (game, square) => {
  const next = cloneGame(game);
  next.board[square[0]][square[1]] = EMPTY;
  return next;
};

export const canSelectPiece = (game, square, enforceRules) => {
  const piece = game.board[square[0]][square[1]];
  if (piece === EMPTY) return false;
  if (!enforceRules) return true;
  return pieceBelongsToSideToMove(game, piece);
};

export { createEmptyAvailabilityMatrix, isInCheck, isWhiteToMove };

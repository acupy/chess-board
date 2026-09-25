import { EMPTY, FIELD_AVAILABILITY } from '../consts';

export const createEmptyAvailabilityMatrix = () =>
  Array.from({ length: 8 }, () => Array(8).fill(FIELD_AVAILABILITY.UNAVAILABLE));

export const cloneBoard = (board) => board.map((rank) => rank.slice());

export const inBounds = (rank, column) =>
  rank >= 0 && rank < 8 && column >= 0 && column < 8;

export const isWhitePiece = (piece) => piece !== EMPTY && piece === piece.toUpperCase();

export const isBlackPiece = (piece) => piece !== EMPTY && piece !== piece.toUpperCase();

export const isOpponentPiece = (piece1, piece2) => {
  if (piece1 === EMPTY || piece2 === EMPTY) return false;
  return isWhitePiece(piece1) !== isWhitePiece(piece2);
};

export const findKing = (board, white) => {
  const king = white ? 'K' : 'k';
  for (let rank = 0; rank < 8; rank++) {
    for (let column = 0; column < 8; column++) {
      if (board[rank][column] === king) {
        return [rank, column];
      }
    }
  }
  return null;
};

export const squareToCoords = (square) => {
  if (!square || square === '-') return null;
  const column = square.charCodeAt(0) - 97;
  const rankNumber = Number(square[1]);
  if (column < 0 || column > 7 || rankNumber < 1 || rankNumber > 8) return null;
  return [8 - rankNumber, column];
};

export const coordsToSquare = ([rank, column]) => {
  const file = String.fromCharCode(97 + column);
  return `${file}${8 - rank}`;
};

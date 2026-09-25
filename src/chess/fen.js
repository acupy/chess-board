import { EMPTY } from '../consts';
import { cloneBoard, coordsToSquare, squareToCoords } from './board';

const expandRank = (rank) => {
  let expanded = '';
  for (const char of rank) {
    if (char >= '1' && char <= '8') {
      expanded += EMPTY.repeat(Number(char));
    } else {
      expanded += char;
    }
  }
  return expanded;
};

export const validateFEN = (fen) => {
  if (!fen || typeof fen !== 'string') return false;
  const placement = fen.trim().split(/\s+/)[0];
  const ranks = placement.split('/').map(expandRank);
  return ranks.length === 8 && ranks.every((rank) => rank.length === 8);
};

export const parsePlacement = (placement) =>
  placement.split('/').map((rank) => expandRank(rank).split(''));

const inferCastling = (board) => ({
  K: board[7][4] === 'K' && board[7][7] === 'R',
  Q: board[7][4] === 'K' && board[7][0] === 'R',
  k: board[0][4] === 'k' && board[0][7] === 'r',
  q: board[0][4] === 'k' && board[0][0] === 'r',
});

const parseCastling = (token) => {
  if (!token || token === '-') {
    return { K: false, Q: false, k: false, q: false };
  }
  return {
    K: token.includes('K'),
    Q: token.includes('Q'),
    k: token.includes('k'),
    q: token.includes('q'),
  };
};

export const parseFEN = (fen) => {
  const parts = fen.trim().split(/\s+/);
  const board = parsePlacement(parts[0]);
  const hasExtraFields = parts.length > 1;

  return {
    board,
    turn: parts[1] === 'b' ? 'b' : 'w',
    castling: hasExtraFields ? parseCastling(parts[2]) : inferCastling(board),
    enPassant: squareToCoords(parts[3] || '-'),
    halfmove: Number(parts[4] || 0),
    fullmove: Number(parts[5] || 1),
  };
};

const compactRank = (rank) => {
  let fen = '';
  let emptyCount = 0;

  rank.forEach((field, index) => {
    if (field === EMPTY) {
      emptyCount += 1;
    } else {
      if (emptyCount) {
        fen += `${emptyCount}`;
        emptyCount = 0;
      }
      fen += field;
    }

    if (index === 7 && emptyCount) {
      fen += `${emptyCount}`;
    }
  });

  return fen;
};

export const serializeFEN = (game) => {
  const placement = game.board.map(compactRank).join('/');
  const castling =
    `${game.castling.K ? 'K' : ''}${game.castling.Q ? 'Q' : ''}${game.castling.k ? 'k' : ''}${game.castling.q ? 'q' : ''}` ||
    '-';
  const enPassant = game.enPassant ? coordsToSquare(game.enPassant) : '-';
  return `${placement} ${game.turn} ${castling} ${enPassant} ${game.halfmove} ${game.fullmove}`;
};

export const cloneGame = (game) => ({
  board: cloneBoard(game.board),
  turn: game.turn,
  castling: { ...game.castling },
  enPassant: game.enPassant ? [...game.enPassant] : null,
  halfmove: game.halfmove,
  fullmove: game.fullmove,
});
